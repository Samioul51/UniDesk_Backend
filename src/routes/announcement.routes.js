import express from "express";
import { createAnnouncement } from "../controllers/AnnouncementController/announcement.controller.js";

const router=express.Router();

router.post("/announcement",createAnnouncement);

export default router;