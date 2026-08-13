import express from 'express';
import { authenticateToken } from '../middleware/auth.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { sendMessage, getChatHistory, getConversations } from '../controllers/chat.js';

const router = express.Router();

router.post('/send', authenticateToken, asyncHandler(sendMessage));
router.get('/history/:user_id', authenticateToken, asyncHandler(getChatHistory));
router.get('/conversations', authenticateToken, asyncHandler(getConversations));

export default router;
