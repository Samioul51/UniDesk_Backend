import express from "express";
import { facultySchedule, scheduleCreation } from "../controllers/ScheduleController/schedule.controller.js";

const router=express.Router();

// Schedule creation

router.post("/schedule",scheduleCreation);

// GET faculty schedule

router.post("/schedule/:id",facultySchedule);

export default router;