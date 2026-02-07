import mongoose, { Schema } from "mongoose";


const materialSchema=new Schema({
    course:{
        type:Schema.Types.ObjectId,
        ref:"courses",
        required:true
    },
    title:{
        type: String,
        required: true,
        lowercase: true
    },
    description:{
        type:String,
        required:true
    },
    url:{
        type:String,
        required:true
    },
    uploader:{
        type:Schema.Types.ObjectId,
        ref:"users",
        required:true
    },
    createdAt:{
        type:Date,
        default:Date.now
    }
});

export const Material=mongoose.model("materials",materialSchema);