import express from "express";
import { courseMaterials, uploadMaterial } from "../controllers/StudyMaterialController/material.controller.js";

const router=express.Router();

// Material upload

router.post("/course/:id/material",uploadMaterial);

// Course wise material

router.get("/course/:id/materials",courseMaterials);

export default router;