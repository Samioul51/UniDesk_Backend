import express from "express";
import { assignSupervisee, getSupervises, getSupervisors, removeSupervisee, updateSuperViseeStatus } from "../controllers/SupervisorController/supervisor.controller.js";

const router=express.Router();

// Assigning supervisee

router.post("/supervisor",assignSupervisee);


// Get faculty supervises

router.get("/supervisor/:supervisorID",getSupervises);

// Get student supervisors

router.get("/supervisor/student/:studentID",getSupervisors);

// Update supervisee status

router.patch("/supervisor/:supervisorID",updateSuperViseeStatus);

// Remove supervisee

router.delete("/supervisor/:supervisorID",removeSupervisee);

export default router;