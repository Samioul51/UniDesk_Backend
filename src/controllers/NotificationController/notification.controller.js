import { Notification } from "../../models/NotificationModel/notification.model.js";

// User wise notifications

export const getNotifications = async (req, res) => {
    try {
        const {userID} = req.query;

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

export const getUnreadCount=async(req,res)=>{
    try {
        const {userID}=req.query;

        const count=await Notification.countDocuments({
            receiver:userID,
            isRead:false
        });

        return res.status(200).json({
            success: true,
            unreadCount:count
        });
    } catch (error) {
        return res.status(500).json({
            message: error.message
        });
    }
}
