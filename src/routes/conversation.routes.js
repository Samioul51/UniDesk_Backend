import express from "express";
import { createConversation, getConversation, getUserConversations } from "../controllers/ConversationController/conversation.controller.js";

const router=express.Router();

// Create conversation

router.post("/conversation",createConversation);

// User conversations

router.get("/conversation/user/:id",getUserConversations);

// Specific conversation

router.get("/conversation/:id",getConversation);

export default router;