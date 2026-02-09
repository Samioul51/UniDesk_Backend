import express from "express";
import { courseAssignments, uploadAssignment } from "../controllers/AssignmentController/assignment.controller.js";

const router=express.Router();

// Course wise assignments

router.get("/course/:id/assignments",courseAssignments);

// Upload assignment

router.post("/course/:id/assignment",uploadAssignment)

export default router;
