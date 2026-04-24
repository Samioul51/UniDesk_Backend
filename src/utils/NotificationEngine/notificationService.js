import { Notification } from "../../models/NotificationModel/notification.model.js"
import { io } from "../../index.js"
import { sendNotificationEmail } from "../Email/sendNotificationEmail.js";
import { User } from "../../models/UserModel/user.model.js";

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
        const uniqueReceivers = [...new Set(receivers.map(id => id.toString()))];

        const notifications = uniqueReceivers.map(userID => ({
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

        for (const userID of uniqueReceivers) {
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

        // Email notification

        const emailEnabledTypes = [
            "NEW_ASSIGNMENT",
            "ASSIGNMENT_UPDATED",
            "ASSIGNMENT_DUE_REMINDER",
            "GRADE_PUBLISHED",
            "NEW_STUDY_MATERIAL",
            "NEW_ANNOUNCEMENT",
            "APPOINTMENT_REQUEST",
            "APPOINTMENT_STATUS_CHANGE",
            "MEETING_REMINDER",
            "CONTRIBUTION_APPROVED",
            "SUPERVISOR_ASSIGNED",
            "SUPERVISEE_CONTACT",
        ];

        if (!emailEnabledTypes.includes(type))
            return;

        const users = await User.find({
            _id: { $in: uniqueReceivers }
        }).select("name email");

        const emailResults = await Promise.allSettled(
            users.map(user =>
                sendNotificationEmail({ user, title, message, redirectURL })
            )
        );

        emailResults.forEach((result, index) => {
            if (result.status === "rejected")
                console.error(`Email failed for ${users[index]?.email}:`, result.reason?.message || result.reason);
        });
    } catch (error) {
        throw error;
    }
};