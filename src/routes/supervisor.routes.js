import express from "express";
import { assignSupervisee, getSupervises } from "../controllers/SupervisorController/supervisor.controller.js";

const router=express.Router();

// Assigning supervisee

router.post("/supervisor",assignSupervisee);


// Get faculty supervises

router.get("/supervisor/:supervisorID",getSupervises);

export default router;