import express from 'express';
import cors from "cors";
import userRoutes from "./routes/user.routes.js";
import courseRoutes from "./routes/course.routes.js";
import announcementRoutes from "./routes/announcement.routes.js";
import repositoryRoutes from "./routes/repository.routes.js";
import materialRoutes from "./routes/material.routes.js";
import assignmentRoutes from "./routes/assignment.routes.js";
import scheduleRoutes from "./routes/schedule.routes.js";

const app=express();

app.use(cors());

app.use(express.json());

// User Routes

app.use("/api",userRoutes);

// Course Routes

app.use("/api",courseRoutes);

// Announcement Routes

app.use("/api", announcementRoutes);


// Material Routes

app.use("/api",materialRoutes);

// Repository routes

app.use("/api",repositoryRoutes);

// Assignment

app.use("/api",assignmentRoutes);

// Schedule routes

app.use("/api",scheduleRoutes)

export default app;