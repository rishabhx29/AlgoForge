import { Request, Response } from 'express';
import { prisma } from '../config/db';
import { getOrSet, TTL } from '../utils/cache';

/** One consistent server-side log line per failed content endpoint. */
function logContentError(route: string, error: unknown): void {
    console.error(`[content] ${route} failed:`, error);
}

/** Slim fields for *list* endpoints: list views never use full descriptions/test cases. */
const LIST_PROBLEM_SELECT = {
    id: true,
    title: true,
    topic_slug: true,
    difficulty: true,
    video_link: true,
    problem_link: true,
    tags: true,
    order_index: true,
} as const;

/** Prisma row → list problem (adds `topic_id` alias used by older UI code). */
function toListProblem(p: {
    id: string; title: string; topic_slug: string; difficulty: string;
    video_link: string | null; problem_link: string | null; tags: string[]; order_index: number;
}) {
    return { ...p, topic_id: p.topic_slug };
}

/** Prisma row types for the catalog queries (inferred, never hand-copied). */
type PathRow = Awaited<ReturnType<typeof prisma.learningPath.findMany>>[number];
type TopicRow = Awaited<ReturnType<typeof prisma.topic.findMany>>[number];

/** Load and cache the full content catalog in one pass (three parallel reads). */
async function loadCatalog() {
    const [paths, topics, problems] = await Promise.all([
        prisma.learningPath.findMany({ orderBy: { order_index: 'asc' } }),
        prisma.topic.findMany({ orderBy: { order_index: 'asc' } }),
        prisma.problem.findMany({
            orderBy: { order_index: 'asc' },
            select: LIST_PROBLEM_SELECT,
        }),
    ]);

    const problemsByTopic = new Map<string, number>();
    for (const p of problems) {
        problemsByTopic.set(p.topic_slug, (problemsByTopic.get(p.topic_slug) || 0) + 1);
    }

    // Map slug back to id for frontend compatibility, add per-path problem count.
    const pathsWithCounts = paths.map((path: PathRow) => ({
        ...path,
        id: path.slug,
        totalProblems: topics
            .filter((t: TopicRow) => t.path_slug === path.slug)
            .reduce((sum: number, t: TopicRow) => sum + (problemsByTopic.get(t.slug) || 0), 0),
    }));

    const topicsWithIds = topics.map((t: TopicRow) => ({ ...t, id: t.slug }));
    const listProblems = problems.map(toListProblem);

    return { paths: pathsWithCounts, topics: topicsWithIds, problems: listProblems };
}

/** Cached catalog (5 min TTL, invalidated on admin content mutations). */
function catalog() {
    return getOrSet('content:catalog', TTL.CONTENT, loadCatalog);
}

/**
 * @desc    Get the full content catalog in one request (paths + topics + problems)
 * @route   GET /api/content/home
 * @access  Public
 */
export const getHomeContent = async (req: Request, res: Response) => {
    try {
        const catalog_ = await catalog();
        res.json(catalog_);
    } catch (error) {
        logContentError('GET /api/content/home', error);
        res.status(500).json({ message: 'Server Error' });
    }
};

/**
 * @desc    Get all learning paths
 * @route   GET /api/content/paths
 * @access  Public
 *
 * Fetches all learning paths ordered by their display index, enriches each
 * path with a total problem count, and maps `slug` to `id` for frontend
 * compatibility. Served from the shared catalog cache (was N+1 per path).
 *
 * @param req - Express request object.
 * @param res - Express response object. Returns a JSON array of learning paths.
 */
export const getLearningPaths = async (req: Request, res: Response) => {
    try {
        const { paths } = await catalog();
        res.json(paths);
    } catch (error) {
        logContentError('GET /api/content/paths', error);
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
    const { pathId } = req.params;
    try {
        const topics = await prisma.topic.findMany({
            where: { path_slug: pathId },
            orderBy: { order_index: 'asc' }
        });

        res.json(topics.map(t => ({ ...t, id: t.slug })));
    } catch (error) {
        logContentError(`GET /api/content/paths/${pathId}/topics`, error);
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
    const { topicId } = req.params;
    try {
        const topic = await prisma.topic.findUnique({
            where: { slug: topicId }
        });
        if (!topic) {
            return res.status(404).json({ message: 'Topic not found' });
        }
        res.json({ ...topic, id: topic.slug });
    } catch (error) {
        logContentError(`GET /api/content/topics/${topicId}`, error);
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
        const { topics } = await catalog();
        res.json(topics);
    } catch (error) {
        logContentError('GET /api/content/topics', error);
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
    const { topicId } = req.params;
    try {
        const { problems } = await catalog();
        res.json(problems.filter((p) => p.topic_slug === topicId));
    } catch (error) {
        logContentError(`GET /api/content/topics/${topicId}/problems`, error);
        res.status(500).json({ message: 'Server Error' });
    }
};

/**
 * @desc    Get all problems
 * @route   GET /api/content/problems
 * @access  Public
 *
 * Fetches every problem in the system, ordered by display index.
 *
 * @param req - Express request object.
 * @param res - Express response. Returns a JSON array of all problem objects.
 */
export const getAllProblems = async (req: Request, res: Response) => {
    try {
        const { problems } = await catalog();
        res.json(problems);
    } catch (error) {
        logContentError('GET /api/content/problems', error);
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
    const { id } = req.params;
    try {
        const problem = await prisma.problem.findUnique({
            where: { id }
        });
        if (!problem) {
            return res.status(404).json({ message: 'Problem not found' });
        }
        res.json(problem);
    } catch (error) {
        logContentError(`GET /api/content/problems/${id}`, error);
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
