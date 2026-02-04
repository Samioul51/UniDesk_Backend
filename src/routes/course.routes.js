import express from "express";
import { adminAllCourses, createCourse, facultyJoinCourseByInvitation, facultyLeaveCourse, getMyCourses, removeStudentFromCourse, singleCourse, studentJoinCourseByInvitation, studentLeaveCourse, updateCourse } from "../controllers/CourseController/course.controller.js";

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

// A single user's courses

router.get("/courses/user/:id",getMyCourses);

// Update course

router.patch("/courses/:id",updateCourse);

// Student leaving course

router.delete("/courses/:id/student/leave",studentLeaveCourse);

// Faculty leaving course

router.delete("/courses/:id/faculty/leave",facultyLeaveCourse);

// Faculty unenrolls student

router.delete("/courses/:courseId/students/:studentId",removeStudentFromCourse);

export default router;