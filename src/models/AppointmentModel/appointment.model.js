import mongoose, { Schema } from "mongoose";

const appointmentSchema=new Schema({
    teacher:{
        type:Schema.Types.ObjectId,
        ref:"users",
        required:true,
        index:true
    },
    student:{
        type:Schema.Types.ObjectId,
        ref:"users",
        required:true,
        index:true
    },
    startTime:{
        type:Date,
        required:true,
    },
    endTime:{
        type:Date,
        required:true
    },
    purpose:{
        type:String,
        required:true,
        trim:true
    },
    status:{
        type:String,
        enum:["pending","approved","completed","rejected","cancelled"],
        default:"pending"
    }
},{
    timestamps:true
});

appointmentSchema.index(
  { teacher: 1, startTime: 1, endTime: 1 },
  { unique: false }
);

export const Appointment=mongoose.model("appointments",appointmentSchema);