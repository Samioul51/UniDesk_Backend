import express from "express";
import { uploadMaterial } from "../controllers/StudyMaterialController/material.controller.js";

const router=express.Router();

// Material upload

router.post("/course/:id/material",uploadMaterial);

export default router;