import express from "express";
import { getItems, getLeaderboard, getSingleItem, itemStatusUpdate, itemUpload } from "../controllers/RepositoryController/repository.controller.js";

const router=express.Router();

// Item upload

router.post("/repository",itemUpload);

// Get items

router.get("/repository",getItems);

// Get leaderboard

router.get("/repository/leaderboard", getLeaderboard);

// Get single item

router.get("/repository/:id",getSingleItem);

// Status update

router.patch("/repository/:id",itemStatusUpdate);

export default router;