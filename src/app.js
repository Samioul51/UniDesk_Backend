import express from 'express';
import cors from "cors";
import userRoutes from "./routes/user.routes.js";
import courseRoutes from "./routes/course.routes.js";
import announcementRoutes from "./routes/announcement.routes.js";

const app=express();

app.use(cors());

app.use(express.json());

// User Routes

app.use("/api",userRoutes);

// Course Routes

app.use("/api",courseRoutes);

// Announcement Routes

app.use("/api", announcementRoutes);

export default app;