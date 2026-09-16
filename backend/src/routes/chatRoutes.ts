import express from 'express';
import { protect } from '../middleware/authMiddleware';
import { chat } from '../controllers/chatController';
import { chatLimiter } from '../middleware/rateLimiter';

const router = express.Router();

// POST /api/chat — requires authentication
// chatLimiter runs AFTER protect so it can key by req.user.id (falls back to IP)
router.post('/', protect, chatLimiter, chat);

export default router;
