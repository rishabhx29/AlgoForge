import dotenv from 'dotenv';
import path from 'path';

// Adjust path to point to backend/.env
dotenv.config({ path: path.join(__dirname, '../../.env') });

import { prisma } from '../config/db';

import { roadmapCategories, topics } from './seedData';
import { dsaProblems } from './data/dsa';
import { algoProblems } from './data/algo';
import { dpProblems } from './data/dp';
import { graphProblems } from './data/graphs';
import { interviewProblems } from './data/interview';
import { systemDesignProblems } from './data/system-design';

const seedData = async () => {
    try {
        console.log('Clearing existing data...');
        await prisma.problem.deleteMany({});
        await prisma.topic.deleteMany({});
        await prisma.learningPath.deleteMany({});

        console.log('Seeding Learning Paths...');
        const learningPaths = roadmapCategories.map(cat => ({
            slug: cat.id,
            title: cat.title,
            description: cat.description,
            icon: cat.icon,
            color: cat.color,
            order_index: roadmapCategories.indexOf(cat)
        }));
        await prisma.learningPath.createMany({ data: learningPaths });

        console.log('Seeding Topics...');
        const topicDocs = topics.map(topic => ({
            slug: topic.id,
            path_slug: topic.category,
            title: topic.title,
            description: topic.description,
            order_index: topic.order_index,
            icon: topic.icon,
            color: topic.color
        }));
        await prisma.topic.createMany({ data: topicDocs });

        console.log('Seeding Problems from Extended Data...');
        const allRawProblems = [
            ...dsaProblems,
            ...algoProblems,
            ...dpProblems,
            ...graphProblems,
            ...interviewProblems,
            ...systemDesignProblems
        ];

        const problems = allRawProblems.map((p, index) => {
            const slug = p.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(?:^-+)|(?:-+$)/g, '');
            return {
                title: p.title,
                topic_slug: p.topic_id,
                difficulty: p.difficulty,
                tags: p.tags,
                video_link: `https://www.youtube.com/results?search_query=${encodeURIComponent(p.title + ' leetcode solution')}`,
                problem_link: `https://leetcode.com/problems/${slug}/`,
                description: `Practice problem: ${p.title}. Analyze the time and space complexity. Solved commonly using ${p.tags.join(', ')}.`,
                order_index: index + 1
            };
        });

        await prisma.problem.createMany({ data: problems });

        console.log(`Data Seeded Successfully! Inserted ${problems.length} problems.`);
        process.exit();
    } catch (error) {
        console.error('Error with data seeding', error);
        process.exit(1);
    }
};

seedData();
