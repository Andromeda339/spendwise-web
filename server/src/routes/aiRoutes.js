import express from 'express';
import { chat, parseTransaction } from '../controllers/aiController.js';
import { protect } from '../middleware/authMiddleware.js';
import { validate } from '../middleware/validate.js';
import { aiLimiter } from '../middleware/security.js';
import { aiChat, aiParse } from '../validation/schemas.js';

const router = express.Router();

// Усі маршрути захищені токеном, а запити до AI мають окремий суворіший ліміт (квота Gemini обмежена)
router.use(protect);

router.post('/chat', aiLimiter, validate(aiChat), chat);
router.post('/parse', aiLimiter, validate(aiParse), parseTransaction);

export default router;
