import mongoose, { Schema } from "mongoose";

const appointmentSchema=new Schema({
    faculty:{
        type:Schema.Types.ObjectId,
        ref:"User",
        required:true,
        index:true
    },
    student:{
        type:Schema.Types.ObjectId,
        ref:"User",
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
    meetingType:{
        type:String,
        enum:["general","thesis","project"],
        default:"general"
    },
    mode:{
        type:String,
        enum:["online","in-person"],
        required:function(){
            return this.isNew;
        }
    },
    meetLink:{
        type:String,
        validate:{
            validator:function(value){
                if(this.mode==="online")
                    return !!value;
                return true;
            },
            message:"Meet link is required for online appointments"
        }
    },
    meetingID:String,
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
    rejectionReason:String,
    reminderSent:{
        type:Boolean,
        default:false
    },
},{
    timestamps:true
});

appointmentSchema.index(
  { faculty: 1, startTime: 1, endTime: 1 },
  { unique: false }
);

export const Appointment=mongoose.model("Appointment",appointmentSchema);