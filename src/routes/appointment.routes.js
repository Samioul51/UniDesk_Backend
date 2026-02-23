import express from "express";
import { bookAppointment, getAppointment, getFacultyAppointments, getStudentAppointments,updateAppointmentStatus } from "../controllers/AppointmentController/appointment.controller.js";

const router=express.Router();

// Appointment creation

router.post("/appointment",bookAppointment);

// Get student appointments

router.get("/appointment/student/:id",getStudentAppointments);

// Get faculty appointments

router.get("/appointment/faculty/:id",getFacultyAppointments);

// Appointment status update

router.patch("/appointment/:id",updateAppointmentStatus);

// Single appointment GET

router.get("/appointment/:id",getAppointment);

export default router;