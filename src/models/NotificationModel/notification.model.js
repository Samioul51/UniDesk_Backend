import mongoose, { Schema } from "mongoose";


const notificationSchema=new Schema({
    receiver:{
        type:Schema.Types.ObjectId,
        ref:"User",
        required:true,
        index:true
    },
    sender:{
        type:Schema.Types.ObjectId,
        ref:"User"
    },
    type:{
        type:String,
        required:true
    },
    title:String,
    message:String,
    entityID:Schema.Types.ObjectId,
    entityModel:String,
    redirectURL:String,
    isRead:{
        type:Boolean,
        default:false
    }
},{
    timestamps:true
});

notificationSchema.index({ receiver:1,isRead:1});
notificationSchema.index({ receiver:1,createdAt:-1});

export const Notification=mongoose.model("Notification",notificationSchema);