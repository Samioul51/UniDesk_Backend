import express from "express";
import { createConversation, getUserConversations } from "../controllers/ConversationController/conversation.controller.js";

const router=express.Router();

// Create conversation

router.post("/conversation",createConversation);

// User conversations

router.get("/conversation/user/:id",getUserConversations);

export default router;