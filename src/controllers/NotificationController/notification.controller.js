import { Notification } from "../../models/NotificationModel/notification.model.js";

// User wise notifications

export const getNotifications = async (req, res) => {
    try {
        const userID=req.dbUser._id;

        const notifications = await Notification.find({ receiver: userID }).sort({ createdAt: -1 }).limit(30);

        return res.status(200).json({
            success: true,
            notifications
        });
    } catch (error) {
        return res.status(500).json({ 
            success:false,
            message: error.message 
        });
    }
};

// Unread count

export const getUnreadCount = async (req, res) => {
    try {
        const userID = req.dbUser._id;

        const count = await Notification.countDocuments({
            receiver: userID,
            isRead: false
        });

        return res.status(200).json({
            success: true,
            unreadCount: count
        });
    } catch (error) {
        return res.status(500).json({ 
            success:false,
            message: error.message 
        });
    }
};

// Mark one as read

export const markOneAsRead = async (req, res) => {
    try {
        const userID = req.dbUser._id;

        const notification=await Notification.findOneAndUpdate(
            {
                _id: req.params.id,
                receiver: userID
            },
            {
                isRead:true
            }
        );

        if(!notification)
            return res.status(404).json({
            success: true,
            message:"Notification not found"
        });


        return res.status(200).json({
            success: true,
            message:"Notification marked as read"
        });
    } catch (error) {
        return res.status(500).json({ 
            success:false,
            message: error.message 
        });
    }
};

// Mark all as read

export const markAllAsRead = async (req, res) => {
    try {
        const userID = req.dbUser._id;

        await Notification.updateMany(
            {
                receiver: userID,
                isRead:false
            },
            {
                $set:{
                    isRead:true
                }
            }
        );

        return res.status(200).json({
            success: true,
            message:"All notifications marked as read"
        });
    } catch (error) {
        return res.status(500).json({ 
            success:false,
            message: error.message 
        });
    }
};

// Conversation notification read

export const markConversationNotificationsRead = async (req, res) => {
    try {
        const conversationID = req.params.conversationID;
        const userID = req.dbUser._id;

        await Notification.updateMany({
            receiver: userID,
            redirectURL: `/chat/${conversationID}`,
            isRead: false
        }, {
            $set: { isRead: true }
        });

        return res.status(200).json({ 
            success: true,
            message:"Notification read successfully" 
        });
    } catch (error) {
        return res.status(500).json({ 
            success: false, 
            message: error.message 
        });
    }
};