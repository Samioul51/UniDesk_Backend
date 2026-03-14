import "dotenv/config";

process.env.TZ = process.env.TZ || "Asia/Dhaka";

import connectDB from './config/db/dbConnect.js';
import app from './app.js';
import http from "http";
import { Server } from 'socket.io';
import "./cron/reminderJobs.js";

const port = process.env.PORT || 3000;

const server=http.createServer(app);

// Socket IO server

export const io=new Server(server,{
    cors:{
        origin:"*",
        methods:["GET","POST"]
    }
});

io.on("connection",(socket)=>{
    console.log("User connected: ",socket.id);

    socket.on("join",(userID)=>{
        socket.join(userID);
        console.log("User joined room: ",userID);
    });

    socket.on("disconnect",()=>{
        console.log("User disconnected: ",socket.id);
    });
});

// MongoDB Connection

connectDB()
    .then(() => {
        server.listen(port, () => {
            console.log(`Server running on ${port}`);
        });

    })
    .catch((error) => {
        console.log("Database connection failed", error);
    });

app.get("/", (req, res) => {
    res.send("Server Running");
});

