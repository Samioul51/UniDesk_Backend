import express from "express";
import { createCourse, facultyJoinCourseByInvitation, studentJoinCourseByInvitation } from "../controllers/CourseController/course.controller.js";

const router=express.Router();

// Course creation

router.post("/courses",createCourse);

// Student join course

router.post("/courses/student/join",studentJoinCourseByInvitation);

// Faculties join course

router.post("/courses/faculty/join",facultyJoinCourseByInvitation);

export default router;