import express from "express";
import { deleteItem, getItems, getLeaderboard, getSingleItem, itemStatusUpdate, itemUpload } from "../controllers/RepositoryController/repository.controller.js";
import { verifyFirebaseToken } from "../middlewares/Auth/auth.middleware.js";
import { verifyRole } from "../middlewares/Role/role.middleware.js";

const router=express.Router();

// Item upload

router.post("/repository",verifyFirebaseToken,verifyRole(["admin","student","faculty"]),itemUpload);

// Get items

router.get("/repository",getItems);

// Get leaderboard

router.get("/repository/leaderboard", getLeaderboard);

// Get single item

router.get("/repository/:id",verifyFirebaseToken,verifyRole(["admin","student","faculty"]),getSingleItem);

// Status update

router.patch("/repository/:id",verifyFirebaseToken,verifyRole(["admin"]),itemStatusUpdate);

// Item deletion

router.delete("/repository/:id",verifyFirebaseToken,verifyRole(["admin"]),deleteItem);

export default router;