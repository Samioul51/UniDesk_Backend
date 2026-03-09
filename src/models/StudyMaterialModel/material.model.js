import mongoose, { Schema } from "mongoose";


const materialSchema=new Schema({
    course:{
        type:Schema.Types.ObjectId,
        ref:"Course",
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
    cloudinaryId:{
        type:String,
        required:true
    },
    uploader:{
        type:Schema.Types.ObjectId,
        ref:"User",
        required:true
    }
},{
    timestamps:true
});

export const Material=mongoose.model("Material",materialSchema);