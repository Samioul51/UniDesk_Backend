import express from "express";
import { createCourse, studentJoinCourseByInvitation } from "../controllers/CourseController/course.controller.js";

const router=express.Router();

// Course creation

router.post("/courses",createCourse);

// Student join course

router.post("/courses/join",studentJoinCourseByInvitation);

export default router;