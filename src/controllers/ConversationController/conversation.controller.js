import { io } from "../../index.js";
import { Conversation } from "../../models/ConversationModel/conversation.model.js";
import { Message } from "../../models/MessageModel/message.model.js";
import { User } from "../../models/UserModel/user.model.js";

// Creating conversation

export const createConversation = async (req, res) => {
    try {
        const { senderID, receiverID } = req.body;

        if (!senderID || !receiverID)
            return res.status(400).json({
                success: false,
                message: "Both users required"
            });

        if (senderID === receiverID)
            return res.status(400).json({
                success: false,
                message: "Cannot create conversation with own"
            });

        const sender = await User.findById(senderID);
        const receiver = await User.findById(receiverID);

        if (!sender || !receiver)
            return res.status(404).json({
                success: false,
                message: "User not found"
            });

        const existingConversation = await Conversation.findOne({
            participants: { $all: [senderID, receiverID] }
        }).populate("participants", "name email");

        if (existingConversation)
            return res.status(200).json({
                success: true,
                message: "Conversation already exists",
                conversation: existingConversation
            });

        const conversation = await Conversation.create({
            participants: [senderID, receiverID]
        });

        return res.status(201).json({
            success: true,
            message: "Conversation created successfully"
        });
    } catch (error) {
        return res.status(500).json({
            message: error.message
        });
    }
};

// User conversations

export const getUserConversations = async (req, res) => {
    try {
        const id = req.params.id;

        const user = await User.findById(id);

        if (!user)
            return res.status(404).json({
                success: false,
                message: "User not found"
            });

        const conversations = await Conversation.find({ participants: { $in: [id] } }).populate("participants", "name email").populate("lastMessage").sort({ updatedAt: -1 });

        return res.status(200).json({
            success: true,
            count: conversations.length,
            conversations
        });
    } catch (error) {
        return res.status(500).json({
            message: error.message
        });
    }
};

// Specific conversation

export const getConversation = async (req, res) => {
    try {
        const id = req.params.id;
        const { userID } = req.query;

        if (!userID)
            return res.status(400).json({
                success: false,
                message: "User ID required"
            });

        const conversation = await Conversation.findById(id).populate("participants", "name email").populate("lastMessage");

        if (!conversation)
            return res.status(404).json({
                success: false,
                message: "Conversation not found"
            });

        const isParticipant = conversation.participants.some(
            p => p._id.toString() === userID
        );

        if (!isParticipant)
            return res.status(403).json({
                success: false,
                message: "Unauthorized user"
            });

        return res.status(200).json({
            success: true,
            conversation
        });
    } catch (error) {
        return res.status(500).json({
            message: error.message
        });
    }
};

// Get messages

export const getMessages = async (req, res) => {
    try {
        const id = req.params.conversationID;
        const { userID, page = 1, limit = 10 } = req.query;
        const skip = (page - 1) * limit;

        if (!userID)
            return res.status(404).json({
                success: false,
                message: "User not found"
            });

        const conversation = await Conversation.findById(id);

        if (!conversation)
            return res.status(404).json({
                success: false,
                message: "Conversation not found"
            });

        const isParticipant = conversation.participants.some(
            p => p.toString() === userID
        );

        if (!isParticipant)
            return res.status(403).json({
                success: false,
                message: "Unauthorized user"
            });

        const messages = await Message.find({ conversation: id }).sort({ createdAt: -1 }).skip(skip).limit(parseInt(limit)).populate("sender", "name email");

        return res.status(200).json({
            success: true,
            page: parseInt(page),
            count: messages.length,
            messages
        });
    } catch (error) {
        return res.status(500).json({
            message: error.message
        });
    }
};

// Sending messages

export const sendMessage = async (req, res) => {
    try {
        const { conversationID, senderID, content } = req.body;

        if (!conversationID || !senderID || !content)
            return res.status(400).json({
                success: false,
                message: "All fields required"
            });

        const conversation = await Conversation.findById(conversationID);

        if (!conversation)
            return res.status(404).json({
                success: false,
                message: "Conversation not found"
            });

        const sender = await User.findById(senderID);

        if (!sender)
            return res.status(404).json({
                success: false,
                message: "User not found"
            });

        const isParticipant = conversation.participants.some(
            p => p.toString() === senderID
        );

        if (!isParticipant)
            return res.status(403).json({
                success: false,
                message: "Unauthorized user"
            });

        const message = await Message.create({
            conversation: conversationID,
            sender: senderID,
            content
        });

        conversation.lastMessage = message._id;

        await conversation.save();

        const populatedMessage = await Message.findById(message._id).populate("sender", "name email");

        const receiverID = conversation.participants.find(
            p => p.toString() !== senderID
        );

        io.to(receiverID.toString()).emit("newMessage", populatedMessage);

        io.to(senderID.toString()).emit("newMessage", populatedMessage);

        return res.status(201).json({
            success: true,
            message: "Message sent",
            data: populatedMessage
        });

    } catch (error) {
        return res.status(500).json({
            message: error.message
        });
    }
};

// Seen status

export const messageSeenStatus = async (req, res) => {
    try {
        const id = req.params.conversationID;
        const { userID } = req.body;

        if (!userID)
            return res.status(400).json({
                success:false,
                message: "User ID required"
            });

        const conversation = await Conversation.findById(id);

        if (!conversation)
            return res.status(404).json({
                success: false,
                message: "Conversation not found"
            });

        const isParticipant = conversation.participants.some(
            p => p.toString() === userID
        );

        if (!isParticipant)
            return res.status(403).json({
                success: false,
                message: "Unauthorized user"
            });

        await Message.updateMany(
            {
                conversation:id,
                sender:{$ne:userID},
                isRead:false
            },
            {
                $set:{isRead:true}
            }
        );

        const receiverID = conversation.participants.find(
            p => p.toString() !== userID
        );

        io.to(receiverID.toString()).emit("messageSeen", {
            conversationID:id,
            seenBy:userID
        });

        return res.status(200).json({
            success:true,
            message: "Messages marked as read"
        });
    } catch (error) {
        return res.status(500).json({
            message: error.message
        });
    }
};