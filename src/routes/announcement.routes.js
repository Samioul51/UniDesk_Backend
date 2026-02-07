import express from "express";
import { createAnnouncement, getCourseAnnouncements, updateAnnouncement } from "../controllers/AnnouncementController/announcement.controller.js";

const router=express.Router();

// Announcement creation

router.post("/course/:id/announcement",createAnnouncement);

// Announcement update

router.patch("/course/:id/announcement/:id",updateAnnouncement);

// Coursewise announcements

router.get("/course/:id/announcements",getCourseAnnouncements);

export default router;