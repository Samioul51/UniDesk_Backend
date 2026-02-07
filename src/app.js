import express from 'express';
import cors from "cors";
import userRoutes from "./routes/user.routes.js";
import courseRoutes from "./routes/course.routes.js";
import materialRoutes from "./routes/material.routes.js";

const app=express();

app.use(cors());

app.use(express.json());

// User Routes

app.use("/api",userRoutes);

// Course Routes

app.use("/api",courseRoutes);


// Material Routes

app.use("/api",materialRoutes)

export default app;