import express from "express";
import { createConversation } from "../controllers/ConversationController/conversation.controller.js";

const router=express.Router();

// Create conversation

router.post("/conversation",createConversation);

export default router;