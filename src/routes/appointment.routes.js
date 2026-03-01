import express from "express";
import { bookAppointment, getAppointment, getFacultyAppointments, getStudentAppointments,updateAppointmentStatus } from "../controllers/AppointmentController/appointment.controller.js";
import { verifyFirebaseToken } from "../middlewares/Auth/auth.middleware.js";
import { verifyRole } from "../middlewares/Role/role.middleware.js";

const router=express.Router();

// Appointment creation

router.post("/appointment",verifyFirebaseToken,verifyRole(["student"]),bookAppointment);

// Get student appointments

router.get("/appointment/student/:id",verifyFirebaseToken,verifyRole(["student"]),getStudentAppointments);

// Get faculty appointments

router.get("/appointment/faculty/:id",verifyFirebaseToken,verifyRole(["faculty"]),getFacultyAppointments);

// Appointment status update

router.patch("/appointment/:id",verifyFirebaseToken,verifyRole(["student","faculty"]),updateAppointmentStatus);

// Single appointment GET

router.get("/appointment/:id",verifyFirebaseToken,verifyRole(["student","faculty"]),getAppointment);

export default router;