import express from "express";
import { createCourse } from "../controllers/CourseController/course.controller.js";

const router=express.Router();

router.post("/courses",createCourse);

export default router;