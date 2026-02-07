import express from "express";
import { createAnnouncement, deleteAnnouncement, getCourseAnnouncements, updateAnnouncement } from "../controllers/AnnouncementController/announcement.controller.js";

const router=express.Router();

// Announcement creation

router.post("/course/:id/announcement",createAnnouncement);

// Announcement update

router.patch("/course/:id/announcement/:id",updateAnnouncement);

// Coursewise announcements

router.get("/course/:id/announcements",getCourseAnnouncements);

// Announcement deletion

router.delete("/course/announcement/:id",deleteAnnouncement);

export default router;