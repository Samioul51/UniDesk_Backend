import dotenv from 'dotenv'
import express from 'express'
import connectDB from './db/dbConnect.js';

const app=express();

dotenv.config();

const port=process.env.PORT || 3000;

// MongoDB Connection

connectDB();

app.get("/",(req,res)=>{
    res.send("Server Running");
});

app.listen(port,()=>{
    console.log(`Server running on ${port}`);
});