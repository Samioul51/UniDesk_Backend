import express from "express";
import { createUser, getSingleUser, getUsers, updateProfile } from "../controllers/UserController/user.controller.js";


const router=express.Router();

// User creation

router.post("/users",createUser);

// All users data

router.get("/users",getUsers);

// Single user data

router.get("/users/:email",getSingleUser);

// Profile update api for user only

router.patch("/users/profile/:email",updateProfile);

export default router;