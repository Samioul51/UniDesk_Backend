import express from "express";
import { courseAssignments, deleteAssignment, getAssignment, updateAssignment, uploadAssignment } from "../controllers/AssignmentController/assignment.controller.js";

const router=express.Router();

// Course wise assignments

router.get("/course/:id/assignments",courseAssignments);

// Upload assignment

router.post("/course/:id/assignment",uploadAssignment);

// Single assignment

router.get("/course/:courseID/assignment/:assignmentID",getAssignment);

// Delete assignment

router.delete("/assignment/:id",deleteAssignment);

// Update assignment

router.patch("/assignment/:id",updateAssignment);

export default router;
