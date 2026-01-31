import mongoose, { Schema } from "mongoose";

const userSchema = new Schema({
    name: {
        type: String,
        required: true,
        lowercase: true
    },
    email: {
        type: String,
        required: true,
        unique: true,
        trim: true,
        lowercase:true,
        index: true
    },
    role: {
        type: String,
        required: true,
        enum: ["student", "faculty"]
    },
    department: {
        type: String,
        required: true,
    },
    studentID: {
        type: String,
        required: function () {
            return this.role === "student";
        }
    },
    batch: {
        type: String,
        required: function () {
            return this.role === "student";
        }
    },
    designation: {
        type: String,
        required: function () {
            return this.role === "faculty";
        }
    },
    photoURL: {
        type: String,
        required: true,
    },
    photoId: {
        type: String,
        required: true,
    },
    status: {
        type: String,
        required: true,
    },
    createdAt: {
        type: Date,
        default: Date.now,
    }
});

export const User = mongoose.model("users", userSchema);