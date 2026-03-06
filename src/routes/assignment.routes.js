import express from "express";
import { courseAssignments, deleteAssignment, getAssignment, getAssignmentSubmissions, getPendingGrading, gradeSubmission, requestRecheckSubmission, resolveRecheckSubmission, submitAssignment, unsubmitAssignment, updateAssignment, uploadAssignment } from "../controllers/AssignmentController/assignment.controller.js";
import { verifyFirebaseToken } from "../middlewares/Auth/auth.middleware.js";
import { verifyRole } from "../middlewares/Role/role.middleware.js";

const router = express.Router();

// Course wise assignments

router.get("/course/:id/assignments", verifyFirebaseToken, verifyRole(["student", "faculty"]), courseAssignments);

// Upload assignment

router.post("/course/:id/assignment", verifyFirebaseToken, verifyRole(["faculty"]), uploadAssignment);

// Single assignment

router.get("/course/:courseID/assignment/:assignmentID", verifyFirebaseToken, verifyRole(["student", "faculty"]), getAssignment);

// Delete assignment

router.delete("/assignment/:id", verifyFirebaseToken, verifyRole(["faculty"]), deleteAssignment);

// Update assignment

router.patch("/assignment/:id", verifyFirebaseToken, verifyRole(["faculty"]), updateAssignment);

// Assignment submission

router.post("/assignment/:id/submit", verifyFirebaseToken, verifyRole(["student"]), submitAssignment);

// Get submissions

router.get("/assignment/:id/submissions", verifyFirebaseToken, verifyRole(["faculty"]), getAssignmentSubmissions);

// Providing marks

router.patch("/assignment/:id/submissions/:submissionId", verifyFirebaseToken, verifyRole(["faculty"]), gradeSubmission);

// Unsubmit assignment

router.delete("/submission/:id", verifyFirebaseToken, verifyRole(["student"]), unsubmitAssignment);

// Recheck submission request by student

router.post("/submission/recheck/:id", verifyFirebaseToken, verifyRole(["student"]), requestRecheckSubmission);

// Resolve submission request by faculty

router.patch("/submission/recheck/:id", verifyFirebaseToken, verifyRole(["faculty"]), resolveRecheckSubmission);

// Get all courses pending assignments

router.get("/submission/faculty/pending", verifyFirebaseToken, verifyRole(["faculty"]),getPendingGrading);

export default router;
