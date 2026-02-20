import express from "express";
import { assignSupervisee, getSupervises, getSupervisors, updateSuperViseeStatus } from "../controllers/SupervisorController/supervisor.controller.js";

const router=express.Router();

// Assigning supervisee

router.post("/supervisor",assignSupervisee);


// Get faculty supervises

router.get("/supervisor/:supervisorID",getSupervises);

// Get student supervisors

router.get("/supervisor/student/:studentID",getSupervisors);

// Update supervisee status

router.patch("/supervisor/:supervisorID",updateSuperViseeStatus);

export default router;