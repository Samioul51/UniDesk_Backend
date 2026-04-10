import express from "express";
import { adminAllCourses, createCourse, facultyJoinCourseByInvitation, facultyLeaveCourse, getMyCourses, removeStudentFromCourse, singleCourse, studentJoinCourseByInvitation, studentLeaveCourse, updateCourse } from "../controllers/CourseController/course.controller.js";
import { verifyFirebaseToken } from "../middlewares/Auth/auth.middleware.js";
import { verifyRole } from "../middlewares/Role/role.middleware.js";

const router=express.Router();

// Course creation

router.post("/courses",verifyFirebaseToken,verifyRole(["faculty"]),createCourse);

// Student join course

router.post("/courses/student/join",verifyFirebaseToken,verifyRole(["student"]),studentJoinCourseByInvitation);

// Faculties join course

router.post("/courses/faculty/join",verifyFirebaseToken,verifyRole(["faculty"]),facultyJoinCourseByInvitation);

// All courses for admin

router.get("/admin/courses",verifyFirebaseToken,verifyRole(["admin"]),adminAllCourses);

// A single user's courses

router.get("/courses/my-courses",verifyFirebaseToken,verifyRole(["faculty","student"]),getMyCourses);

// Single course

router.get("/courses/:id",verifyFirebaseToken,verifyRole(["faculty","student","admin"]),singleCourse);

// Update course

router.patch("/courses/:id",verifyFirebaseToken,verifyRole(["faculty"]),updateCourse);

// Student leaving course

router.delete("/courses/:id/student/leave",verifyFirebaseToken,verifyRole(["student"]),studentLeaveCourse);

// Faculty leaving course

router.delete("/courses/:id/faculty/leave",verifyFirebaseToken,verifyRole(["faculty"]),facultyLeaveCourse);

// Faculty unenrolls student

router.delete("/courses/:courseId/students/:studentId",verifyFirebaseToken,verifyRole(["faculty"]),removeStudentFromCourse);

export default router;