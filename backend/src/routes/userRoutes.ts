import express from 'express';
import { getLeaderboard, getDashboardStats, getUserProfile, updateUserProfile, getMyRank } from '../controllers/userController';
import { protect } from '../middleware/authMiddleware';

const router = express.Router();

router.get('/leaderboard', getLeaderboard);
router.get('/leaderboard/me', protect, getMyRank);
router.get('/dashboard-stats', protect, getDashboardStats);
router.get('/:userId/profile', getUserProfile);
router.put('/:userId/profile', protect, updateUserProfile);

export default router;