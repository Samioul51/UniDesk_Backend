import express from "express";
import { facultySchedule, scheduleCreation, updateSchedule } from "../controllers/ScheduleController/schedule.controller.js";
import { verifyFirebaseToken } from "../middlewares/Auth/auth.middleware.js";
import { verifyRole } from "../middlewares/Role/role.middleware.js";

const router=express.Router();

// Schedule creation

router.post("/schedule",verifyFirebaseToken,verifyRole(["faculty","admin"]),scheduleCreation);

// GET faculty schedule

router.get("/schedule/:id",verifyFirebaseToken,verifyRole(["faculty","admin","student"]),facultySchedule);

// Update schedule

router.patch("/schedule",verifyFirebaseToken,verifyRole(["faculty","admin"]),updateSchedule);

export default router;