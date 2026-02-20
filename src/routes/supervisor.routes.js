import express from "express";
import { assignSupervisee } from "../controllers/SupervisorController/supervisor.controller.js";

const router=express.Router();

// Assigning supervisee

router.post("/supervisor",assignSupervisee);

export default router;