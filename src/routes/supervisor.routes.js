import express from "express";
import { assignSupervisee, getSupervises, getSupervisors, removeSupervisee, updateSuperViseeStatus } from "../controllers/SupervisorController/supervisor.controller.js";
import { verifyFirebaseToken } from "../middlewares/Auth/auth.middleware.js";
import { verifyRole } from "../middlewares/Role/role.middleware.js";

const router=express.Router();

// Assigning supervisee

router.post("/supervisor",verifyFirebaseToken,verifyRole(["faculty","admin"]),assignSupervisee);

// Get student supervisors

router.get("/supervisor/student/:studentID",verifyFirebaseToken,verifyRole(["student","admin"]),getSupervisors);

// Get faculty supervises

router.get("/supervisor/:supervisorID",verifyFirebaseToken,verifyRole(["faculty","admin"]),getSupervises);

// Update supervisee status

router.patch("/supervisor/:supervisorID",verifyFirebaseToken,verifyRole(["faculty","admin"]),updateSuperViseeStatus);

// Remove supervisee

router.delete("/supervisor/:supervisorID",verifyFirebaseToken,verifyRole(["faculty","admin"]),removeSupervisee);

export default router;