import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Binary,
  Cpu,
  GitBranch,
  Network,
  Briefcase,
  Server,
  ArrowRight,
  PlayCircle
} from 'lucide-react';
import { getLearningPaths, getTopicsByPath, getProblemsByTopic } from '@/api/content';
import { getUserProgress } from '@/api/userActions';
import { useAuth } from '@/contexts/AuthContext';
import { useStats } from '@/hooks/useStats';

interface RoadmapsProps {
  onPathClick: (pathId: string) => void;
}

const iconMap: Record<string, React.ElementType> = {
  Binary,
  Cpu,
  GitBranch,
  Network,
  Briefcase,
  Server
};

export function Roadmaps({ onPathClick }: RoadmapsProps) {
  const { user } = useAuth();
  const [hoveredCategory, setHoveredCategory] = useState<string | null>(null);
  const { problemCount, videoCount, roadmapCount, userCount } = useStats();

  const [categories, setCategories] = useState<any[]>([]);
  const [topicsMap, setTopicsMap] = useState<Record<string, any[]>>({});
  const [pathSolvedCounts, setPathSolvedCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const paths = await getLearningPaths();
        setCategories(paths);

        const topicsData: Record<string, any[]> = {};
        // Also collect all problem _ids per path for progress matching
        const pathProblemIds: Record<string, string[]> = {};

        await Promise.all(paths.map(async (path: any) => {
          const pathTopics = await getTopicsByPath(path.id);
          topicsData[path.id] = pathTopics;

          // Fetch problems for each topic to get their _ids
          const problemIds: string[] = [];
          await Promise.all(pathTopics.map(async (topic: any) => {
            try {
              const problems = await getProblemsByTopic(topic.id);
              problems.forEach((p: any) => problemIds.push(p.id));
            } catch { /* ignore */ }
          }));
          pathProblemIds[path.id] = problemIds;
        }));
        setTopicsMap(topicsData);

        // Fetch user progress and compute solved counts per path
        if (user) {
          try {
            const progressData = await getUserProgress();
            const solvedSet = new Set<string>(
              progressData
                .filter((p: any) => p.status === 'SOLVED')
                .map((p: any) => p.problem_id)
            );

            const counts: Record<string, number> = {};
            for (const [pathId, pIds] of Object.entries(pathProblemIds)) {
              counts[pathId] = pIds.filter(id => solvedSet.has(id)).length;
            }
            setPathSolvedCounts(counts);
          } catch { /* user not logged in or error */ }
        }
      } catch (e) {
        console.error("Failed to load roadmaps", e);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [user]);

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 30 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.6,
        ease: [0.16, 1, 0.3, 1] as const
      }
    }
  };

  if (loading) {
    return <div className="py-24 text-center text-white/60">Loading roadmaps...</div>;
  }

  return (
    <section id="roadmaps" className="relative py-24 overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 grid-pattern opacity-20" />

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <h2 className="font-display text-4xl sm:text-5xl text-white mb-4">
            Learning <span className="gradient-text">Roadmaps</span>
          </h2>
          <p className="text-lg text-white/60 max-w-2xl mx-auto">
            Choose your path and start your journey. Each roadmap is carefully curated
            to take you from beginner to expert.
          </p>
        </motion.div>

        {/* Bento Grid */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
        >
          {categories.map((category) => {
            const Icon = iconMap[category.icon] || Binary;
            const topics = topicsMap[category.id] || [];
            const totalProblems = category.totalProblems || 0;
            const solvedCount = pathSolvedCounts[category.id] || 0;
            const progressPercent = totalProblems > 0 ? Math.round((solvedCount / totalProblems) * 100) : 0;

            return (
              <motion.div
                key={category.id}
                variants={itemVariants}
                onMouseEnter={() => setHoveredCategory(category.id)}
                onMouseLeave={() => setHoveredCategory(null)}
                className="group relative"
              >
                <div
                  className="relative h-full glass rounded-2xl p-6 overflow-hidden card-hover cursor-pointer"
                  style={{
                    transform: hoveredCategory === category.id
                      ? 'translateY(-4px) scale(1.02)'
                      : 'translateY(0) scale(1)',
                    transition: 'transform 0.3s cubic-bezier(0.16, 1, 0.3, 1)'
                  }}
                  onClick={() => onPathClick(category.id)}
                >
                  {/* Gradient Border Effect */}
                  <div
                    className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500"
                    style={{
                      background: `linear-gradient(135deg, ${category.color}40, transparent)`,
                      padding: '1px'
                    }}
                  />

                  {/* Content */}
                  <div className="relative z-10">
                    {/* Icon & Title */}
                    <div className="flex items-start justify-between mb-4">
                      <div
                        className="w-14 h-14 rounded-xl flex items-center justify-center"
                        style={{ background: `${category.color}20` }}
                      >
                        <Icon
                          className="w-7 h-7"
                          style={{ color: category.color }}
                        />
                      </div>
                      <div className="flex items-center gap-1 text-white/40">
                        <span className="text-sm">{topics.length} topics</span>
                      </div>
                    </div>

                    <h3 className="text-xl font-semibold text-white mb-2 group-hover:text-[#a088ff] transition-colors">
                      {category.title}
                    </h3>
                    <p className="text-white/60 text-sm mb-4 line-clamp-2">
                      {category.description}
                    </p>

                    {/* Progress */}
                    <div className="mb-4">
                      <div className="flex items-center justify-between text-sm mb-2">
                        <span className="text-white/60">Progress</span>
                        <span className="text-white/80">{solvedCount}/{totalProblems}</span>
                      </div>
                      <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                        <motion.div
                          initial={{ width: 0 }}
                          whileInView={{ width: `${progressPercent}%` }}
                          viewport={{ once: true }}
                          transition={{ duration: 1, delay: 0.5 }}
                          className="h-full rounded-full"
                          style={{ background: category.color }}
                        />
                      </div>
                    </div>

                    {/* Topics Preview */}
                    <div className="space-y-2">
                      {topics.slice(0, 3).map((topic: any) => (
                        <div
                          key={topic.id}
                          className="flex items-center gap-2 text-sm text-white/60"
                        >
                          <PlayCircle className="w-4 h-4" style={{ color: category.color }} />
                          <span className="truncate">{topic.title}</span>
                        </div>
                      ))}
                      {topics.length > 3 && (
                        <div className="text-sm text-white/40 pl-6">
                          +{topics.length - 3} more topics
                        </div>
                      )}
                    </div>

                    {/* CTA */}
                    <div className="mt-6 pt-4 border-t border-white/10">
                      <button
                        className="flex items-center gap-2 text-sm font-medium group/btn"
                        style={{ color: category.color }}
                      >
                        Start Learning
                        <ArrowRight className="w-4 h-4 group-hover/btn:translate-x-1 transition-transform" />
                      </button>
                    </div>
                  </div>

                  {/* Hover Glow */}
                  <div
                    className="absolute -bottom-20 -right-20 w-40 h-40 rounded-full blur-[60px] opacity-0 group-hover:opacity-50 transition-opacity duration-500"
                    style={{ background: category.color }}
                  />
                </div>
              </motion.div>
            );
          })}
        </motion.div>

        {/* Stats Row */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.3 }}
          className="mt-16 grid grid-cols-2 md:grid-cols-4 gap-4"
        >
          {[
            { label: 'Total Problems', value: problemCount, color: '#a088ff' },
            { label: 'Video Solutions', value: videoCount, color: '#63e3ff' },
            { label: 'Learning Paths', value: roadmapCount, color: '#ff8a63' },
            { label: 'Active Learners', value: userCount, color: '#88ff9f' }
          ].map((stat) => (
            <div
              key={stat.label}
              className="glass rounded-xl p-4 text-center"
            >
              <p
                className="text-2xl sm:text-3xl font-bold mb-1"
                style={{ color: stat.color }}
              >
                {stat.value}
              </p>
              <p className="text-sm text-white/60">{stat.label}</p>
            </div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
