import express from "express";
import { createAnnouncement, updateAnnouncement } from "../controllers/AnnouncementController/announcement.controller.js";

const router=express.Router();

router.post("/announcement",createAnnouncement);

router.patch("/announcement/:id",updateAnnouncement);

export default router;