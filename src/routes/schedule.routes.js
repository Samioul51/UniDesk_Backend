import express from "express";
import { facultySchedule, scheduleCreation, updateSchedule } from "../controllers/ScheduleController/schedule.controller.js";

const router=express.Router();

// Schedule creation

router.post("/schedule",scheduleCreation);

// GET faculty schedule

router.get("/schedule/:id",facultySchedule);

// Update schedule

router.patch("/schedule",updateSchedule);

export default router;