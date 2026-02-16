import { Conversation } from "../../models/ConversationModel/conversation.model.js";
import { User } from "../../models/UserModel/user.model.js";

// Creating conversation

export const createConversation = async (req, res) => {
    try {
        const { senderID, receiverID } = req.body;

        if (!senderID || !receiverID)
            return res.status(400).json({
                success: false,
                message: "Both users required"
            });

        if(senderID===receiverID)
            return res.status(400).json({
                success: false,
                message: "Cannot create conversation with own"
            });

        const sender=await User.findById(senderID);
        const receiver=await User.findById(receiverID);

        if (!sender || !receiver)
            return res.status(404).json({
                success: false,
                message: "User not found"
            });

        const existingConversation=await Conversation.findOne({
            participants:{$all:[senderID,receiverID]}
        }).populate("participants","name email");

        if(existingConversation)
            return res.status(200).json({
                success: true,
                message: "Conversation already exists",
                conversation:existingConversation
            });

        const conversation=await Conversation.create({
            participants:[senderID,receiverID]
        });

        return res.status(201).json({
            success:true,
            message:"Conversation created successfully"
        });
    } catch (error) {
        return res.status(500).json({
            message: error.message
        });
    }
};