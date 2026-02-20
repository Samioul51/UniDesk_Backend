import express from "express";
import { assignSupervisee, getSupervises, getSupervisors } from "../controllers/SupervisorController/supervisor.controller.js";

const router=express.Router();

// Assigning supervisee

router.post("/supervisor",assignSupervisee);


// Get faculty supervises

router.get("/supervisor/:supervisorID",getSupervises);

// Get student supervisors

router.get("/supervisor/student/:studentID",getSupervisors);

export default router;