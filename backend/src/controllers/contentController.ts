import { Request, Response } from 'express';
import { prisma } from '../config/db';

/**
 * @desc    Get all learning paths
 * @route   GET /api/content/paths
 * @access  Public
 *
 * Fetches all learning paths ordered by their display index, enriches each
 * path with a total problem count, and maps `slug` to `id` for frontend
 * compatibility.
 *
 * @param req - Express request object.
 * @param res - Express response object. Returns a JSON array of learning paths.
 */
export const getLearningPaths = async (req: Request, res: Response) => {
    try {
        const paths = await prisma.learningPath.findMany({
            orderBy: { order_index: 'asc' }
        });

        const pathsWithCounts = await Promise.all(paths.map(async (path: any) => {
            const topics = await prisma.topic.findMany({
                where: { path_slug: path.slug },
                select: { slug: true }
            });
            const topicSlugs = topics.map(t => t.slug);
            const totalProblems = await prisma.problem.count({
                where: { topic_slug: { in: topicSlugs } }
            });
            // Map slug back to id for frontend compatibility
            return { ...path, id: path.slug, totalProblems };
        }));

        res.json(pathsWithCounts);
    } catch (error) {
        res.status(500).json({ message: 'Server Error' });
    }
};

/**
 * @desc    Get topics by learning path ID (slug)
 * @route   GET /api/content/paths/:pathId/topics
 * @access  Public
 *
 * Fetches all topics that belong to the specified learning path, ordered by
 * their display index, and maps `slug` to `id` for frontend compatibility.
 *
 * @param req - Express request. Expects `pathId` in `req.params`.
 * @param res - Express response. Returns a JSON array of topic objects.
 */
export const getTopicsByPath = async (req: Request, res: Response) => {
    try {
        const { pathId } = req.params;
        const topics = await prisma.topic.findMany({
            where: { path_slug: pathId },
            orderBy: { order_index: 'asc' }
        });

        res.json(topics.map(t => ({ ...t, id: t.slug })));
    } catch (error) {
        res.status(500).json({ message: 'Server Error' });
    }
};

/**
 * @desc    Get topic by ID (slug)
 * @route   GET /api/content/topics/:topicId
 * @access  Public
 *
 * Fetches a single topic by its slug. Returns 404 if no matching topic exists.
 *
 * @param req - Express request. Expects `topicId` in `req.params`.
 * @param res - Express response. Returns the topic object or an error message.
 */
export const getTopicById = async (req: Request, res: Response) => {
    try {
        const { topicId } = req.params;
        const topic = await prisma.topic.findUnique({
            where: { slug: topicId }
        });
        if (!topic) {
            return res.status(404).json({ message: 'Topic not found' });
        }
        res.json({ ...topic, id: topic.slug });
    } catch (error) {
        res.status(500).json({ message: 'Server Error' });
    }
};

/**
 * @desc    Get all topics
 * @route   GET /api/content/topics
 * @access  Public
 *
 * Fetches every topic across all learning paths, ordered by display index, and
 * maps `slug` to `id` for frontend compatibility.
 *
 * @param req - Express request object.
 * @param res - Express response. Returns a JSON array of all topic objects.
 */
export const getAllTopics = async (req: Request, res: Response) => {
    try {
        const topics = await prisma.topic.findMany({
            orderBy: { order_index: 'asc' }
        });
        res.json(topics.map(t => ({ ...t, id: t.slug })));
    } catch (error) {
        res.status(500).json({ message: 'Server Error' });
    }
};

/**
 * @desc    Get problems by topic ID (slug)
 * @route   GET /api/content/topics/:topicId/problems
 * @access  Public (authenticated user will get progress status later)
 *
 * Fetches all problems belonging to the specified topic, ordered by their
 * display index.
 *
 * @param req - Express request. Expects `topicId` in `req.params`.
 * @param res - Express response. Returns a JSON array of problem objects.
 */
export const getProblemsByTopic = async (req: Request, res: Response) => {
    try {
        const { topicId } = req.params;
        const problems = await prisma.problem.findMany({
            where: { topic_slug: topicId },
            orderBy: { order_index: 'asc' }
        });
        res.json(problems);
    } catch (error) {
        res.status(500).json({ message: 'Server Error' });
    }
};

/**
 * @desc    Get all problems (paginated)
 * @route   GET /api/content/problems?page=1&limit=20
 * @access  Public
 *
 * Fetches a page of problems ordered by display index. Returns total count
 * and page metadata so the frontend can render a "Load More" button.
 *
 * @param req - Express request. Accepts optional `page` and `limit` query params.
 * @param res - Express response. Returns `{ problems, total, page, limit, totalPages }`.
 */
export const getAllProblems = async (req: Request, res: Response) => {
    try {
        const page = Math.max(1, parseInt(req.query.page as string) || 1);
        const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 20));
        const skip = (page - 1) * limit;

        const [problems, total] = await Promise.all([
            prisma.problem.findMany({
                orderBy: { order_index: 'asc' },
                skip,
                take: limit
            }),
            prisma.problem.count()
        ]);

        res.json({
            problems,
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit)
        });
    } catch (error) {
        res.status(500).json({ message: 'Server Error' });
    }
};

/**
 * @desc    Get problem by ID
 * @route   GET /api/content/problems/:id
 * @access  Public
 *
 * Fetches a single problem by its unique ID. Returns 404 if not found.
 *
 * @param req - Express request. Expects `id` in `req.params`.
 * @param res - Express response. Returns the problem object or an error message.
 */
export const getProblemById = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const problem = await prisma.problem.findUnique({
            where: { id }
        });
        if (!problem) {
            return res.status(404).json({ message: 'Problem not found' });
        }
        res.json(problem);
    } catch (error) {
        res.status(500).json({ message: 'Server Error' });
    }
};

/**
 * @desc    Execute code for a problem
 * @route   POST /api/content/problems/:id/execute
 * @access  Protected (requires authentication + rate limiting)
 *
 * Validates the submitted code and language, retrieves the problem's test
 * cases, then sends each test case to the Piston code-execution API. Returns
 * a structured result indicating whether each test case passed or failed.
 *
 * Input validation:
 * - `code` and `language` must be non-empty strings.
 * - `code` must not exceed {@link MAX_CODE_LENGTH} characters.
 *
 * @param req - Express request. Expects `id` in `req.params` and
 *              `{ code, language }` in `req.body`.
 * @param res - Express response. Returns `{ success, allPassed, results }` on
 *              success, or an appropriate HTTP error response.
 */
export const executeCode = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const { code, language } = req.body;

        const MAX_CODE_LENGTH = 50000;
        if (typeof code !== 'string' || typeof language !== 'string' || !code || !language) {
            return res.status(400).json({ message: 'Code and language are required' });
        }
        if (code.length > MAX_CODE_LENGTH) {
            return res.status(400).json({ message: 'Code exceeds maximum allowed length.' });
        }

        const problem = await prisma.problem.findUnique({
            where: { id }
        });

        if (!problem) {
            return res.status(404).json({ message: 'Problem not found' });
        }

        const PISTON_LANGUAGES: Record<string, string> = {
            javascript: '18.15.0',
            python: '3.10.0',
            cpp: '10.2.0',
            java: '15.0.2'
        };

        const version = PISTON_LANGUAGES[language] || '*';

        // If no test cases exist, just run the code with empty stdin
        const testCases = problem.testCases && problem.testCases.length > 0
            ? problem.testCases
            : [{ input: '', expectedOutput: '', isHidden: false }];

        const results = await Promise.all(testCases.map(async (testCase) => {
            const response = await fetch('https://emkc.org/api/v2/piston/execute', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    language,
                    version,
                    files: [
                        { content: code }
                    ],
                    stdin: testCase.input,
                    args: [],
                    compile_timeout: 10000,
                    run_timeout: 3000,
                    compile_memory_limit: -1,
                    run_memory_limit: -1
                })
            });

            const data = await response.json();
            const output = data.run?.output || data.message || 'No output';
            const stdout = data.run?.stdout || '';
            const stderr = data.run?.stderr || '';
            const error = data.compile?.stderr || data.run?.stderr || '';
            const isError = data.run?.signal ? true : data.run?.code !== 0;

            let passed = false;
            if (!isError) {
                // Trim trailing whitespaces/newlines for comparison
                const actual = stdout.trim();
                const expected = testCase.expectedOutput.trim();
                passed = actual === expected;
            }

            return {
                input: testCase.isHidden ? 'Hidden Test Case' : testCase.input,
                expectedOutput: testCase.isHidden ? 'Hidden' : testCase.expectedOutput,
                output: testCase.isHidden ? (passed ? 'Hidden' : 'Hidden Test Case Failed') : output,
                stdout: testCase.isHidden ? 'Hidden' : stdout,
                stderr: testCase.isHidden ? (error ? 'Hidden Error' : '') : stderr,
                error: testCase.isHidden ? (error ? 'Hidden Error' : '') : error,
                passed,
                isError,
                executionTime: data.run?.signal ? 'Timeout' : data.run?.code === 0 ? 'Success' : 'Error',
                isHidden: testCase.isHidden
            };
        }));

        const allPassed = results.every(r => r.passed);

        res.json({
            success: true,
            allPassed,
            results
        });

    } catch (error) {
        console.error('Execution error:', error);
        res.status(500).json({ message: 'Execution Server Error' });
    }
};
