import mongoose, { Schema } from "mongoose";

const assignmentSchema = new Schema({
    course: {
        type: Schema.Types.ObjectId,
        ref: "Course",
        required: true
    },
    title: {
        type: String,
        required: true
    },
    description: {
        type: String,
        required: true,
    },
    dueDate: {
        type: Date,
        required: true
    },
    totalMarks: {
        type: Number,
        required: true
    },
    attachments: [{
        url: {
            type: String
        },
        cloudinaryId: {
            type: String
        }
    }],
    createdBy: {
        type: Schema.Types.ObjectId,
        ref: "User",
        required: true
    },
    reminderSent: {
        type: Boolean,
        default: false
    }
},{
    timestamps:true
});

export const Assignment = mongoose.model("Assignment", assignmentSchema);