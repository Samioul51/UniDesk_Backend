import express from "express";
import { createConversation, getConversation, getMessages, getUserConversations, messageSeenStatus, sendMessage } from "../controllers/ConversationController/conversation.controller.js";

const router=express.Router();

// Create conversation

router.post("/conversation",createConversation);

// User conversations

router.get("/conversation/user/:id",getUserConversations);

// Specific conversation

router.get("/conversation/:id",getConversation);

// Get messages

router.get("/conversation/messages/:conversationID",getMessages);

// Send messages

router.post("/messages",sendMessage);

// Seen status

router.patch("/messages/read/:conversationID",messageSeenStatus);

export default router;