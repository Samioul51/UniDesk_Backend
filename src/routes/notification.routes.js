import express from "express";
import { getNotifications, getUnreadCount, markAllAsRead, markOneAsRead } from "../controllers/NotificationController/notification.controller.js";

const router=express.Router();

// User wise notifications

router.get("/notifications",getNotifications);

// Unread count

router.get("/notifications/unread",getUnreadCount);

// Mark as read

router.patch("/notifications/:id",markOneAsRead);

// Mark all as read

router.patch("/notifications/all",markAllAsRead);

export default router;