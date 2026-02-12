import mongoose, { Schema } from "mongoose";

const scheduleSchema = new Schema({
    faculty: {
        type: Schema.Types.ObjectId,
        ref: "User",
        required: true,
        unique: true,
        index: true
    },
    weeklySchedule: [
        {
            day: {
                type: String,
                enum: ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"],
                required:true
            },
            classes:[
                {
                    courseName:String,
                    startTime:String,
                    endTime:String
                }
            ],
            freeSlots:[
                {
                    startTime:{
                        type:String,
                        required:true,
                        trim:true
                    },
                    endTime:{
                        type:String,
                        required:true,
                        trim:true
                    },
                }
            ]
        }
    ]
},{
    timestamps:true
});

export const Schedule=mongoose.model("Schedule",scheduleSchema);