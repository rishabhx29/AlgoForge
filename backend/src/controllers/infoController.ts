import { Request, Response } from 'express';
import { prisma } from '../config/db';
import { getOrSet, TTL } from '../utils/cache';

export const getStats = async (req: Request, res: Response) => {
    try {
        // Cached for 60s: these counters change slowly and are requested by
        // every visitor on the landing page (Hero + Roadmaps stats row).
        const stats = await getOrSet('stats:public', TTL.STATS, async () => {
            const [userCount, problemCount, roadmapCount, videoCount] = await Promise.all([
                prisma.user.count(),
                prisma.problem.count(),
                prisma.learningPath.count(),
                // Count problems with video links (neither null nor empty string)
                prisma.problem.count({
                    where: {
                        video_link: { not: null, notIn: [""] }
                    }
                }),
            ]);
            return { userCount, problemCount, roadmapCount, videoCount };
        });

        res.status(200).json(stats);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server Error' });
    }
};
