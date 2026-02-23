import mongoose, { Schema } from "mongoose";

const repositorySchema = new Schema({
    title: {
        type: String,
        required: true
    },
    courseCode: {
        type: String,
        required: true,
        uppercase: true,
        index: true
    },
    courseName: {
        type: String,
        required: true,
        lowercase: true
    },
    year: {
        type: String,
        required: true
    },
    semester: {
        type: String,
        required: true
    },
    itemType: {
        type: String,
        required: true,
        enum: ["notes", "question bank", "solved questions", "assignment", "project_report", "lab_report", "other"]
    },
    url: {
        type: String,
        required: true
    },
    uploader: {
        type: Schema.Types.ObjectId,
        ref: "User",
        required: true
    },
    description: {
        type: String,
        required: true
    },
    status: {
        type: String,
        enum: ["pending", "approved", "rejected"],
        default: "pending"
    },
    rejectedReason: {
        type: String
    },
    downloadCount: {
        type: Number,
        default: 0
    },
    contributionPoints: {
        type: Number,
        default: 0
    },
    approvedBy: {
        type: Schema.Types.ObjectId,
        ref: "User"
    },
    approvedAt:{
        type:Date
    }

}, {
    timestamps: true
});

export const Repository = mongoose.model("repository", repositorySchema,"repository");