import mongoose, { Schema } from "mongoose";

const courseSchema=new Schema({
    courseCode:{
        type:String,
        required:true,
        uppercase:true,
        index:true
    },
    courseName:{
        type:String,
        required:true,
    },
    description:{
        type:String,
        required:true
    },
    session:{
        type:String,
        required:true,
        index:true
    },
    department:{
        type:String,
        required:true,
        lowercase:true
    },
    year:{
        type:String,
        required:true
    },
    semester:{
        type:String,
        required:true
    },
    faculties:[{
        type:Schema.Types.ObjectId,
        ref:"User",
        required:true
    }],
    students:[{
        type:Schema.Types.ObjectId,
        ref:"User"
    }],
    invitationCode:{
        type:String,
        required:true,
        unique:true,
        index:true
    },
    createdAt:{
        type:Date,
        default:Date.now
    }
});

courseSchema.index(
    {
        courseCode:1,
        session:1
    },
    {
        unique:true
    }
)

export const Course=mongoose.model("Course",courseSchema);