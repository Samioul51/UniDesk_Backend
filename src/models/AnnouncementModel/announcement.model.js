import mongoose, { Schema } from "mongoose";


const announcementSchema = new Schema({
    course: {
        type: Schema.Types.ObjectId,
        required: true,
        index: true,
        ref: "Course"
    },
    title: {
        type: String,
        required: true
    },
    description: {
        type: String,
        required: true
    },
    faculty: {
        type: Schema.Types.ObjectId,
        ref: "User",
        required: true
    },
    attachments:[{
        name:{
            type:String
        },
        url:{
            type:String
        },
        cloudinaryId:{
            type:String
        }
    }],
    createdAt: {
        type: Date,
        default: Date.now
    }
});

export const Announcement = mongoose.model("Announcement", announcementSchema);