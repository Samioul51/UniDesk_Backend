import mongoose, { Schema } from "mongoose";

const messageSchema=new Schema({
    conversation:{
        type:Schema.Types.ObjectId,
        ref:"Conversation",
        required:true,
        index:true
    },
    sender:{
        type:Schema.Types.ObjectId,
        ref:"User",
        required:true
    },
    content:{
        type:String,
        trim:true
    },
    read:{
        type:Boolean,
        default:false
    }
},{
    timestamps:true
});

messageSchema.index({conversation:1,createdAt:-1})

export const Message=mongoose.model("Message",messageSchema);