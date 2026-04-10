import mongoose, { Schema } from "mongoose";

const conversationSchema = new Schema({
    participants: {
        type: [Schema.Types.ObjectId],
        ref: "User",
        required: true,
        validate: {
            validator: function (v) {
                return (Array.isArray(v) && v.length === 2);
            },
            message: "Conversation must have exactly 2 participants"
        }
    },
    lastMessage: {
        type: Schema.Types.ObjectId,
        ref: "Message"
    }
}, {
    timestamps: true
});

conversationSchema.pre("save", async function () {
    const uniqueParticipants = [...new Set(this.participants.map(id => id.toString()))];

    if (uniqueParticipants.length !== 2)
        throw new Error("Conversation must have two different participants");

    this.participants = uniqueParticipants.sort().map(id => new mongoose.Types.ObjectId(id));
});

conversationSchema.index({ participants: 1, updatedAt: -1 });

export const Conversation = mongoose.model("Conversation", conversationSchema);