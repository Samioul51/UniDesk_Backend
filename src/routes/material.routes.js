import express from "express";
import { courseMaterials, deleteMaterial, uploadMaterial } from "../controllers/StudyMaterialController/material.controller.js";

const router=express.Router();

// Material upload

router.post("/course/:id/material",uploadMaterial);

// Course wise material

router.get("/course/:id/materials",courseMaterials);

// Material deletion

router.delete("/course/material/:id",deleteMaterial);

export default router;