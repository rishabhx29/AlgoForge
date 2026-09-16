import express from 'express';
import { getLeaderboard, getDashboardStats, getUserProfile, updateUserProfile, getMyRank, resolveProfileKey } from '../controllers/userController';
import { protect } from '../middleware/authMiddleware';

const router = express.Router();

router.get('/leaderboard', getLeaderboard);
router.get('/leaderboard/me', protect, getMyRank);
router.get('/dashboard-stats', protect, getDashboardStats);
router.get('/profile-key/:pid', resolveProfileKey);
router.get('/:userId/profile', getUserProfile);
router.put('/:userId/profile', protect, updateUserProfile);

export default router;