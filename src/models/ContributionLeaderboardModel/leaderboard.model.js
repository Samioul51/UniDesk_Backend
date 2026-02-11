const { Schema, default: mongoose } = require("mongoose");


const leaderboardSchema=new Schema({
    user:{
        type: Schema.Types.ObjectId,
        ref: "users",
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

export const Leaderboard=mongoose.model("leaderboard",leaderboardSchema);