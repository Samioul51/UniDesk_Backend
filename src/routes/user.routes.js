import express from "express";
import { createUser, getSingleUser, getUsers } from "../controllers/UserController/user.controller.js";


const router=express.Router();

router.post("/users",createUser);

router.get("/users",getUsers);

router.get("/users/:email",getSingleUser);

export default router;