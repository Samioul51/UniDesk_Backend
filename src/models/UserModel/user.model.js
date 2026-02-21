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
    room:{
        type: String,
        required: function () {
            return this.role === "faculty";
        },
        trim:true
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
        enum:["pending","verified"],
        default:"pending"
    }
},{
    timestamps:true
});

export const User = mongoose.model("User", userSchema);