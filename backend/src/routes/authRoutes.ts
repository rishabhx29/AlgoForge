import express from 'express';
const router = express.Router();
import { registerUser, loginUser, getMe, googleAuth } from '../controllers/authController';
import { protect } from '../middleware/authMiddleware';
import {
    registerLimiter,
    loginLimiter,
    googleAuthLimiter
} from '../middleware/rateLimiter';

// Validation middleware (zod) — runs before controllers
import { validate } from '../middleware/validate';
import {
    registerSchema,
    loginSchema,
    googleAuthSchema
} from '../validators/authSchemas';

router.post('/', registerLimiter, validate(registerSchema), registerUser);
router.post('/login', loginLimiter, validate(loginSchema), loginUser);
router.post('/google', googleAuthLimiter, validate(googleAuthSchema), googleAuth);
router.get('/me', protect, getMe);

export default router;
