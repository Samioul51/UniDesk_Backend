import express from "express";
import { courseMaterials, deleteMaterial, uploadMaterial } from "../controllers/StudyMaterialController/material.controller.js";
import { verifyRole } from "../middlewares/Role/role.middleware.js";
import { verifyFirebaseToken } from "../middlewares/Auth/auth.middleware.js";

const router=express.Router();

// Material upload

router.post("/course/:id/material",verifyFirebaseToken,verifyRole(["faculty"]),uploadMaterial);

// Course wise material

router.get("/course/:id/materials",verifyFirebaseToken,verifyRole(["student","faculty"]),courseMaterials);

// Material deletion

router.delete("/course/material/:id",verifyFirebaseToken,verifyRole(["faculty"]),deleteMaterial);

export default router;