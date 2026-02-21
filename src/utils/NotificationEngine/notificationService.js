import { Notification } from "../../models/NotificationModel/notification.model.js"
import { io } from "../../index.js"

export const notifyUsers = async ({
    receivers,
    sender,
    type,
    title,
    message,
    entityID,
    entityModel,
    redirectURL
}) => {
    try {
        const notifications = receivers.map(userID => ({
            receiver: userID,
            sender,
            type,
            title,
            message,
            entityID,
            entityModel,
            redirectURL
        }));

        await Notification.insertMany(notifications);

        for (const userID of receivers) {
            const old = await Notification.find({ receiver: userID }).sort({ createdAt: -1 }).skip(30);

            if (old.length > 0)
                await Notification.deleteMany({
                    _id: { $in: old.map(n => n._id) }
                });

            const unreadCount = await Notification.countDocuments({
                receiver: userID,
                isRead: false
            });

            io.to(userID.toString()).emit("new_notification");
            io.to(userID.toString()).emit("unread_count", unreadCount);
        }
    } catch (error) {
        throw error;
    }
};