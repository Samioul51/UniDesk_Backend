import "dotenv/config";

process.env.TZ = process.env.TZ || "Asia/Dhaka";

import connectDB from './config/db/dbConnect.js';
import app from './app.js';
import http from "http";
import { Server } from 'socket.io';
import "./cron/reminderJobs.js";

const port = process.env.PORT || 3000;

const server = http.createServer(app);

// Socket IO server

export const io = new Server(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

const onlineUsers = new Set();

io.on("connection", (socket) => {
    // console.log("User connected: ",socket.id);

    // Room joining

    socket.on("join", (userID) => {
        socket.join(userID);
        socket.userID = userID;
        onlineUsers.add(userID);
        io.emit("userOnline", userID);
        console.log("User joined room: ", userID);
    });

    // Online status

    socket.on("checkOnline", (userID) => {
        socket.emit("onlineStatus", {
            userID,
            isOnline: onlineUsers.has(userID)
        });
    });

    // Typing indicator

    socket.on("typing", ({ conversationID, receiverID }) => {
        io.to(receiverID).emit("typing", { conversationID });
    });

    socket.on("stopTyping", ({ conversationID, receiverID }) => {
        io.to(receiverID).emit("stopTyping", { conversationID });
    });

    // Room leaving

    socket.on("disconnect", () => {
        if (socket.userID) {
            onlineUsers.delete(socket.userID);
            io.emit("userOffline", socket.userID);
        }
        // console.log("User disconnected: ",socket.id);
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

