import mongoose, { Schema } from "mongoose";

const submissionSchema = new Schema({
    assignment: {
        type: Schema.Types.ObjectId,
        ref: "Assignment",
        required: true
    },
    course: {
        type: Schema.Types.ObjectId,
        ref: "Course",
        required: true
    },
    student: {
        type: Schema.Types.ObjectId,
        ref: "User",
        required: true
    },
    submissionURL: {
        type: String,
        required: true
    },
    cloudinaryId: {
        type: String,
        required: true
    },
    submittedAt: {
        type: Date,
        default: Date.now
    },
    isGraded: {
        type: Boolean,
        default: false
    },
    gradedBy: {
        type: Schema.Types.ObjectId,
        ref: "User",
        default: null
    },
    marks: {
        type: Number,
        default: null
    },
    feedback: {
        type: String
    },
});

submissionSchema.index(
    { 
        assignment: 1, 
        student: 1 
    },
    { 
        unique: true 
    }
);

export const Submission = mongoose.model("Submission", submissionSchema);