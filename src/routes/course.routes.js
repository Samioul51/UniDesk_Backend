import express from "express";
import { adminAllCourses, createCourse, facultyJoinCourseByInvitation, singleCourse, studentJoinCourseByInvitation } from "../controllers/CourseController/course.controller.js";

const router=express.Router();

// Course creation

router.post("/courses",createCourse);

// Student join course

router.post("/courses/student/join",studentJoinCourseByInvitation);

// Faculties join course

router.post("/courses/faculty/join",facultyJoinCourseByInvitation);

// All courses for admin

router.get("/admin/courses",adminAllCourses);

// Single course

router.get("/courses/:id",singleCourse);

export default router;