import express from "express";
import { adminDeleteUser, adminUpdateProfile, createUser, getSingleUser, getUsers, updateProfile } from "../controllers/UserController/user.controller.js";
import { verifyFirebaseToken } from "../middlewares/Auth/auth.middleware.js";
import { verifyRole } from "../middlewares/Role/role.middleware.js";


const router=express.Router();

// User creation

router.post("/users",verifyFirebaseToken,createUser);

// All users data

router.get("/admin/users",verifyFirebaseToken,verifyRole(["admin"]),getUsers);

// Single user data

router.get("/users/:email",verifyFirebaseToken,verifyRole(["admin","student","faculty"]),getSingleUser);

// Profile update api for user only

router.patch("/users/profile/:email",verifyFirebaseToken,verifyRole(["student","faculty"]),updateProfile);

// Profile update api for admin only

router.patch("/admin/users/:email",verifyFirebaseToken,verifyRole(["admin"]),adminUpdateProfile);

// User delete api for admin only

router.delete("/admin/users/:email",verifyFirebaseToken,verifyRole(["admin"]),adminDeleteUser);

export default router;