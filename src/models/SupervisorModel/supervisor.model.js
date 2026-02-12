import mongoose, { Schema } from "mongoose";

const supervisorSchema = new Schema({
    supervisor: {
        type: Schema.Types.ObjectId,
        ref: "User",
        required: true,
        unique:true,
        index:true
    },
    supervises: [{
        student: {
            type: Schema.Types.ObjectId,
            ref: "User",
            required: true
        },
        status: {
            type: String,
            enum: ["active", "completed"],
            default: "active"
        },
        relationshipType: {
            type: String,
            required: true,
            enum: ["thesis", "project"]
        }
    }
    ]
}, {
    timestamps: true
});

export const Supervisor = mongoose.model("Supervisor", supervisorSchema);