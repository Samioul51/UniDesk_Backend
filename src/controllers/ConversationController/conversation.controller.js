import { notificationTypes } from "../../constants/notificationTypes.js";
import { io } from "../../index.js";
import { Conversation } from "../../models/ConversationModel/conversation.model.js";
import { Message } from "../../models/MessageModel/message.model.js";
import { User } from "../../models/UserModel/user.model.js";
import { formatName } from "../../utils/FormatName/formatName.js";
import { notifyUsers } from "../../utils/NotificationEngine/notificationService.js";
import mongoose from "mongoose";

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
        console.log("receiver found:", receiver?._id);

        if (!receiver)
            return res.status(404).json({
                success: false,
                message: "Receiver not found"
            });

        const senderObjId = new mongoose.Types.ObjectId(senderID);
        const receiverObjId = new mongoose.Types.ObjectId(receiverID);

        let conversation = await Conversation.findOne({
            participants: {
                $all: [senderObjId, receiverObjId],
                $size: 2
            }
        }).populate("participants", "name email");

        console.log("existing conversation:", conversation?._id);

        console.log("senderID:", senderID);
        console.log("receiverID:", receiverID);
        console.log("body:", req.body);

        if (conversation)
            return res.status(200).json({
                success: true,
                message: "Conversation already exists",
                conversation
            });

        conversation = await Conversation.create({
            participants: [senderObjId, receiverObjId]
        });

        conversation = await Conversation.findById(conversation._id)
            .populate("participants", "name email");

        return res.status(201).json({
            success: true,
            message: "Conversation created successfully",
            conversation
        });

    } catch (error) {
        console.error("createConversation ERROR:", error.message);
        return res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// User Conversations

export const getUserConversations = async (req, res) => {
    try {
        const user = req.dbUser;
        const search = req.query.search?.trim();

        const page = Math.max(parseInt(req.query.page) || 1, 1);
        const limit = Math.min(parseInt(req.query.limit) || 20, 50);
        const skip = (page - 1) * limit;

        // Inbox mode

        if (!search) {
            const conversations = await Conversation.find({
                participants: user._id // Current user must be a participant
            }).populate("participants", "name email role department photoURL").populate("lastMessage").sort({ updatedAt: -1 }).skip(skip).limit(limit);

            const results = await Promise.all(conversations.map(async conversation => {
                const otherUser = conversation.participants.find(
                    p => p._id.toString() !== user._id.toString()
                );

                const unreadCount = await Message.countDocuments({
                    conversation: conversation._id,
                    sender: { $ne: user._id },
                    read: false
                });

                return {
                    user: otherUser,
                    conversationID: conversation._id,
                    lastMessage: conversation.lastMessage?.content || null,
                    lastMessageSenderID: conversation.lastMessage?.sender?.toString() || null,
                    updatedAt: conversation.updatedAt,
                    unreadCount
                };
            }));

            return res.status(200).json({ 
                success: true, 
                mode: "inbox", 
                count: results.length, 
                users: results 
            });
        }

        // Filtering by regular expression

        const cleanSearch = search.replace(/[\s.]/g, "");
        const fuzzyPattern = cleanSearch.split("").join("[.\\s]*");
        const searchRegex = new RegExp(fuzzyPattern, "i");

        let roleFilter = {};
        if (user.role.toLowerCase() === "student") 
            roleFilter.role = "faculty";
        if (user.role.toLowerCase() === "faculty") 
            roleFilter.role = { $in: ["student", "faculty"] };

        const users = await User.find({
            ...roleFilter,
            _id: { $ne: user._id },
            $or: [
                { name: searchRegex },
                { email: new RegExp(search, "i") }
            ]
        }).select("name email role department photoURL");


        const userIDs = users.map(u => u._id);

        const conversations = await Conversation.find({
            $and: [
                { participants: user._id },
                { participants: { $in: userIDs } }
            ]
        }).populate("lastMessage");

        const conversationMap = {};
        conversations.forEach(conversation => {
            const otherUser = conversation.participants.find(
                p => p.toString() !== user._id.toString()
            );
            
            if (otherUser) 
                conversationMap[otherUser.toString()] = conversation;
        });

        const results = users.map(u => {
            const conversation = conversationMap[u._id.toString()];
            return {
                user: u,
                conversationID: conversation ? conversation._id : null,
                lastMessage: conversation?.lastMessage?.content || null
            };
        });

        return res.status(200).json({ 
            success: true, 
            mode: "search", 
            count: results.length, 
            users: results 
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

        const page = Math.max(parseInt(req.query.page) || 1, 1);
        const limit = Math.min(parseInt(req.query.limit) || 10, 50);
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

        const [populatedMessage] = await Promise.all([
            Message.findById(message._id).populate("sender", "name email photoURL"),
            Conversation.findByIdAndUpdate(conversationID, { lastMessage: message._id })
        ]);

        const receiverID = conversation.participants.find(
            p => p.toString() !== senderID.toString()
        );

        io.to(receiverID.toString()).emit("newMessage", populatedMessage);

        io.to(senderID.toString()).emit("newMessage", populatedMessage);


        notifyUsers({
            receivers: [receiverID],
            sender: senderID,
            type: notificationTypes.newMessage,
            title: "New Message",
            message: `${formatName(sender.name)} sent you a message`,
            entityID: conversation._id,
            entityModel: "Conversation",
            redirectURL: `/chat/${conversation._id}`
        }).catch(err => console.error(err));

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