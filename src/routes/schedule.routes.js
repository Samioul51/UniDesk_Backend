import express from "express";
import { scheduleCreation } from "../controllers/ScheduleController/schedule.controller.js";

const router=express.Router();

// Schedule creation

router.post("/schedule",scheduleCreation);