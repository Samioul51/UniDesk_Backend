import { notificationTypes } from "../../constants/notificationTypes.js";
import { io } from "../../index.js";
import { Conversation } from "../../models/ConversationModel/conversation.model.js";
import { Message } from "../../models/MessageModel/message.model.js";
import { User } from "../../models/UserModel/user.model.js";
import { notifyUsers } from "../../utils/NotificationEngine/notificationService.js";

// Creating conversation

export const createConversation = async (req, res) => {
    try {
        const senderID = req.dbUser._id;
        const { receiverID } = req.body;

        if (!receiverID)
            return res.status(400).json({
                success: false,
                message: "Receiver required"
            });

        if (senderID.toString() === receiverID.toString())
            return res.status(400).json({
                success: false,
                message: "Cannot create conversation with own"
            });

        const receiver = await User.findById(receiverID);

        if (!receiver)
            return res.status(404).json({
                success: false,
                message: "Receiver not found"
            });

        const participants = [senderID, receiverID].sort();

        let conversation = await Conversation.findOne({ participants }).populate("participants", "name email");

        if (conversation)
            return res.status(200).json({
                success: true,
                message: "Conversation already exists",
                conversation
            });

        conversation = await Conversation.create({ participants });

        return res.status(201).json({
            success: true,
            message: "Conversation created successfully",
            conversation
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// User conversations

export const getUserConversations = async (req, res) => {
    try {
        const id = req.params.id;

        const user = req.dbUser;

        if (id.toString() !== user._id.toString())
            return res.status(403).json({
                success: false,
                message: "You are not authorized to get conversations"
            });

        const conversations = await Conversation.find({ participants: { $in: [id] } }).populate("participants", "name email").populate("lastMessage").sort({ updatedAt: -1 });

        return res.status(200).json({
            success: true,
            count: conversations.length,
            conversations
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// Specific conversation

export const getConversation = async (req, res) => {
    try {
        const id = req.params.id;
        const user = req.dbUser;

        const conversation = await Conversation.findById(id).populate("participants", "name email").populate("lastMessage");

        if (!conversation)
            return res.status(404).json({
                success: false,
                message: "Conversation not found"
            });

        const isParticipant = conversation.participants.some(
            p => p._id.toString() === user._id.toString()
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
            success: false,
            message: error.message
        });
    }
};

// Get messages

export const getMessages = async (req, res) => {
    try {
        const id = req.params.conversationID;

        const userID = req.dbUser._id;

        const { page = 1, limit = 10 } = req.query;
        const skip = (page - 1) * limit;

        const conversation = await Conversation.findById(id);

        if (!conversation)
            return res.status(404).json({
                success: false,
                message: "Conversation not found"
            });

        const isParticipant = conversation.participants.some(
            p => p.toString() === userID.toString()
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
            success: false,
            message: error.message
        });
    }
};

// Sending messages

export const sendMessage = async (req, res) => {
    try {
        const { conversationID, content } = req.body;

        const senderID = req.dbUser._id;

        if (!conversationID || !content)
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

        const isParticipant = conversation.participants.some(
            p => p.toString() === senderID.toString()
        );

        if (!isParticipant)
            return res.status(403).json({
                success: false,
                message: "Unauthorized user"
            });

        const sender = await User.findById(senderID).select("name");

        const message = await Message.create({
            conversation: conversationID,
            sender: senderID,
            content
        });

        conversation.lastMessage = message._id;

        await conversation.save();

        const populatedMessage = await Message.findById(message._id).populate("sender", "name email");

        const receiverID = conversation.participants.find(
            p => p.toString() !== senderID.toString()
        );

        io.to(receiverID.toString()).emit("newMessage", populatedMessage);

        io.to(senderID.toString()).emit("newMessage", populatedMessage);

        try {
            await notifyUsers({
                receivers: [receiverID],
                sender: senderID,
                type: notificationTypes.newMessage,
                title: "New Message",
                message: `${sender.name} sent you a message`,
                entityID: conversation._id,
                entityModel: "Conversation",
                redirectURL: `/chat/${conversation._id}`
            });
        } catch (error) {
            console.error(error.message);
        }

        return res.status(201).json({
            success: true,
            message: "Message sent",
            data: populatedMessage
        });

    } catch (error) {
        return res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// Seen status

export const messageSeenStatus = async (req, res) => {
    try {
        const id = req.params.conversationID;
        const userID = req.dbUser._id;

        const conversation = await Conversation.findById(id);

        if (!conversation)
            return res.status(404).json({
                success: false,
                message: "Conversation not found"
            });

        const isParticipant = conversation.participants.some(
            p => p.toString() === userID.toString()
        );

        if (!isParticipant)
            return res.status(403).json({
                success: false,
                message: "Unauthorized user"
            });

        await Message.updateMany(
            {
                conversation: id,
                sender: { $ne: userID },
                read: false
            },
            {
                $set: { read: true }
            }
        );

        const receiverID = conversation.participants.find(
            p => p.toString() !== userID.toString()
        );

        io.to(receiverID.toString()).emit("messageSeen", {
            conversationID: id,
            seenBy: userID
        });

        return res.status(200).json({
            success: true,
            message: "Messages marked as read"
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: error.message
        });
    }
};