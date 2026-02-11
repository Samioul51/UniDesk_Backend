import express from "express";
import { getItems, getSingleItem, itemUpload } from "../controllers/RepositoryController/repository.controller";

const router=express.Router();

// Item upload

router.post("/repository",itemUpload);

// Get items

router.get("/repository",getItems);

// Get single item

router.get("/repository/:id",getSingleItem);

export default router;