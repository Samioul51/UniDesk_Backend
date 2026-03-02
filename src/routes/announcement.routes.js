import express from "express";
import { createAnnouncement, deleteAnnouncement, getCourseAnnouncements, updateAnnouncement } from "../controllers/AnnouncementController/announcement.controller.js";
import { verifyFirebaseToken } from "../middlewares/Auth/auth.middleware.js";
import { verifyRole } from "../middlewares/Role/role.middleware.js";

const router=express.Router();

// Announcement creation

router.post("/course/:id/announcement",verifyFirebaseToken,verifyRole(["faculty"]),createAnnouncement);

// Announcement update

router.patch("/course/:courseID/announcement/:announcementID",verifyFirebaseToken,verifyRole(["faculty"]),updateAnnouncement);

// Coursewise announcements

router.get("/course/:id/announcements",verifyFirebaseToken,verifyRole(["faculty","student"]),getCourseAnnouncements);

// Announcement deletion

router.delete("/course/announcement/:id",verifyFirebaseToken,verifyRole(["faculty"]),deleteAnnouncement);

export default router;