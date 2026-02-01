import express from "express";
import { adminDeleteUser, adminUpdateProfile, createUser, getSingleUser, getUsers, updateProfile } from "../controllers/UserController/user.controller.js";


const router=express.Router();

// User creation

router.post("/users",createUser);

// All users data

router.get("/admin/users",getUsers);

// Single user data

router.get("/users/:email",getSingleUser);

// Profile update api for user only

router.patch("/users/profile/:email",updateProfile);

// Profile update api for admin only

router.patch("/admin/users/:email",adminUpdateProfile);

// User delete api for admin only

router.delete("/admin/users/:email",adminDeleteUser);

export default router;