import express from "express";
import { courseAssignments, deleteAssignment, getAssignment, getAssignmentSubmissions, gradeSubmission, submitAssignment, updateAssignment, uploadAssignment } from "../controllers/AssignmentController/assignment.controller.js";

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

// Assignment submission

router.patch("/assignment/:id/submit",submitAssignment);

// Get submissions

router.get("/assignment/:id/submissions",getAssignmentSubmissions);

// Providing marks

router.patch("/assignment/:id/submissions/:submissionId",gradeSubmission);

export default router;
