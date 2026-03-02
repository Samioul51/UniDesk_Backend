import express from "express";
import { createConversation, getConversation, getMessages, getUserConversations, messageSeenStatus, sendMessage } from "../controllers/ConversationController/conversation.controller.js";
import { verifyFirebaseToken } from "../middlewares/Auth/auth.middleware.js";
import { verifyRole } from "../middlewares/Role/role.middleware.js";

const router=express.Router();

// Create conversation

router.post("/conversation",verifyFirebaseToken,verifyRole(["student","faculty"]),createConversation);

// User conversations

router.get("/conversation/user/:id",verifyFirebaseToken,verifyRole(["student","faculty"]),getUserConversations);

// Specific conversation

router.get("/conversation/:id",verifyFirebaseToken,verifyRole(["student","faculty"]),getConversation);

// Get messages

router.get("/conversation/messages/:conversationID",verifyFirebaseToken,verifyRole(["student","faculty"]),getMessages);

// Send messages

router.post("/messages",verifyFirebaseToken,verifyRole(["student","faculty"]),sendMessage);

// Seen status

router.patch("/messages/read/:conversationID",verifyFirebaseToken,verifyRole(["student","faculty"]),messageSeenStatus);

export default router;