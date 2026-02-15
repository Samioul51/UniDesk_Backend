import mongoose, { Schema } from "mongoose";

const appointmentSchema=new Schema({
    faculty:{
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
    },
    cancelRequestedByStudent:{ 
        type:Boolean, 
        default:false 
    },
    studentCancelReason:String,
    facultyCancelReason:String,
    rejectionReason:String
},{
    timestamps:true
});

appointmentSchema.index(
  { faculty: 1, startTime: 1, endTime: 1 },
  { unique: false }
);

export const Appointment=mongoose.model("Appointment",appointmentSchema);