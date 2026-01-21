import dotenv from 'dotenv';
import connectDB from './db/dbConnect.js';
import app from './app.js';

dotenv.config();

const port = process.env.PORT || 3000;

// MongoDB Connection

connectDB()
    .then(() => {
        app.listen(port, () => {
            console.log(`Server running on ${port}`);
        });

    })
    .catch((error) => {
        console.log("Database connection failed", error);
    });

app.get("/", (req, res) => {
    res.send("Server Running");
});

