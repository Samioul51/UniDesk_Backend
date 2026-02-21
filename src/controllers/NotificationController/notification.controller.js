import { Notification } from "../../models/NotificationModel/notification.model.js";

// User wise notifications

export const getNotifications = async (req, res) => {
    try {
        const { userID } = req.query;

        if (!userID)
            return res.status(400).json({
                success: false,
                message: "User ID required"
            });

        const notifications = await Notification.find({ receiver: userID }).sort({ createdAt: -1 }).limit(30);

        return res.status(200).json({
            success: true,
            notifications
        });
    } catch (error) {
        return res.status(500).json({
            message: error.message
        });
    }
};

// Unread count

export const getUnreadCount = async (req, res) => {
    try {
        const { userID } = req.query;

        if (!userID)
            return res.status(400).json({
                success: false,
                message: "User ID required"
            });

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
            message: error.message
        });
    }
};

// Mark one as read

export const markOneAsRead = async (req, res) => {
    try {
        const { userID } = req.body;

        if (!userID)
            return res.status(400).json({
                success: false,
                message: "User ID required"
            });

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
            message: error.message
        });
    }
};

// Mark all as read

export const markAllAsRead = async (req, res) => {
    try {
        const { userID } = req.body;

        if (!userID)
            return res.status(400).json({
                success: false,
                message: "User ID required"
            });

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
            message: error.message
        });
    }
};

