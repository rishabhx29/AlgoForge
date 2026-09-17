import express from 'express';
import {
    getLearningPaths,
    getTopicsByPath,
    getProblemsByTopic,
    getTopicById,
    getAllProblems,
    getProblemById,
    getAllTopics,
    getHomeContent,
    executeCode
} from '../controllers/contentController';
import { protect } from '../middleware/authMiddleware';
import { executionRateLimiter } from '../middleware/rateLimiter';

const router = express.Router();

router.get('/paths', getLearningPaths);
router.get('/paths/:pathId/topics', getTopicsByPath);
router.get('/home', getHomeContent);
router.get('/topics', getAllTopics);
router.get('/topics/:topicId', getTopicById);
router.get('/topics/:topicId/problems', getProblemsByTopic);
router.get('/problems', getAllProblems);
router.get('/problems/:id', getProblemById);
router.post('/problems/:id/execute', protect, executionRateLimiter, executeCode);

export default router;
