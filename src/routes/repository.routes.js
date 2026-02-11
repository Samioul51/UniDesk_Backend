import express from "express";
import { itemUpload } from "../controllers/RepositoryController/repository.controller";

const router=express.Router();

// Item upload

router.post("/repository",itemUpload);


export default router;