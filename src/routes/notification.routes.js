import express from "express";
import { getNotifications, getUnreadCount, markAllAsRead, markConversationNotificationsRead, markOneAsRead } from "../controllers/NotificationController/notification.controller.js";
import { verifyFirebaseToken } from "../middlewares/Auth/auth.middleware.js";
import { verifyRole } from "../middlewares/Role/role.middleware.js";

const router=express.Router();

// User wise notifications

router.get("/notifications",verifyFirebaseToken,verifyRole(["admin","faculty","student"]),getNotifications);

// Unread count

router.get("/notifications/unread",verifyFirebaseToken,verifyRole(["admin","faculty","student"]),getUnreadCount);

// Mark all as read

router.patch("/notifications/all",verifyFirebaseToken,verifyRole(["admin","faculty","student"]),markAllAsRead);

// Conversation notification read

router.patch("/notifications/conversation/:conversationID", verifyFirebaseToken,verifyRole(["faculty","student"]), markConversationNotificationsRead);

// Mark as read

router.patch("/notifications/:id",verifyFirebaseToken,verifyRole(["admin","faculty","student"]),markOneAsRead);

export default router;