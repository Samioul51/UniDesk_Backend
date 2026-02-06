import mongoose, { Schema } from "mongoose";


const announcementSchema = new Schema({
    course: {
        type: Schema.Types.ObjectId,
        required: true,
        index: true,
        ref: "courses"
    },
    title: {
        type: String,
        required: true
    },
    description: {
        type: String,
        required: true
    },
    teacher: {
        type: Schema.Types.ObjectId,
        ref: "users",
        required: true
    },
    attachments:[{
        name:{
            type:String
        },
        url:{
            type:String
        }
    }],
    createdAt: {
        type: Date,
        default: Date.now
    }
});

export const Announcement = mongoose.model("announcements", announcementSchema);