import mongoose, { Schema } from "mongoose";

const leaderboardSchema=new Schema({
    user:{
        type: Schema.Types.ObjectId,
        ref: "User",
        required: true,
        unique:true
    },
    totalPoints:{
        type:Number,
        default:0
    },
    itemsUploaded:{
        type:Number,
        default:0
    },
    itemsApproved:{
        type:Number,
        default:0
    }
},{
    timestamps:true
});

export const Leaderboard=mongoose.model("leaderboard",leaderboardSchema,"leaderboard");