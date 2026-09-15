import { useState, useEffect } from 'react';
import type { CSSProperties } from 'react';
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

/** Skeleton mirroring the roadmap card grid — 6 tiles, same heights. */
function RoadmapsSkeleton() {
  return (
    <section className="relative py-24" aria-hidden="true">
      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="pb-4 mb-8 border-b border-[rgba(241,238,234,0.2)]">
          <div className="skeleton h-9 w-72 rounded-[4px] mb-4" />
          <div className="skeleton h-4 w-full max-w-2xl rounded-[3px]" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="bg-[#222225] border border-[rgba(241,238,234,0.1)] rounded-[6px] p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="skeleton w-10 h-10 rounded-[4px]" />
                <div className="skeleton h-4 w-16 rounded-[3px]" />
              </div>
              <div className="skeleton h-5 w-40 rounded-[3px] mb-3" />
              <div className="skeleton h-3.5 w-full rounded-[3px] mb-2" />
              <div className="skeleton h-3.5 w-4/5 rounded-[3px] mb-5" />
              <div className="skeleton h-1 w-full rounded-[1px]" />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export function Roadmaps({ onPathClick }: RoadmapsProps) {
  const { user } = useAuth();
  const { problemCount, videoCount, roadmapCount, userCount } = useStats();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [categories, setCategories] = useState<any[]>([]);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [topicsMap, setTopicsMap] = useState<Record<string, any[]>>({});
  const [pathSolvedCounts, setPathSolvedCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const paths = await getLearningPaths();
        setCategories(paths);

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const topicsData: Record<string, any[]> = {};
        // Also collect all problem _ids per path for progress matching
        const pathProblemIds: Record<string, string[]> = {};

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await Promise.all(paths.map(async (path: any) => {
          const pathTopics = await getTopicsByPath(path.id);
          topicsData[path.id] = pathTopics;

          // Fetch problems for each topic to get their _ids
          const problemIds: string[] = [];
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          await Promise.all(pathTopics.map(async (topic: any) => {
            try {
              const problems = await getProblemsByTopic(topic.id);
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                .filter((p: any) => p.status === 'SOLVED')
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
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

  if (loading) {
    return <RoadmapsSkeleton />;
  }

  return (
    <section id="roadmaps" className="relative py-24">
      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="pb-4 mb-8 border-b border-[rgba(241,238,234,0.2)]">
          <h2 className="text-3xl sm:text-4xl font-medium text-[#f1eeea] tracking-[-0.03em] mb-3">
            Learning roadmaps
          </h2>
          <p className="text-[0.9375rem] text-[#b6b1ad] leading-relaxed max-w-2xl">
            Choose your path and start your journey. Each roadmap is carefully curated
            to take you from beginner to expert.
          </p>
        </div>

        {/* Paths — bordered surfaces on hairlines, no hover lift, no glow */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 stagger">
          {categories.map((category, tileIndex) => {
            const Icon = iconMap[category.icon] || Binary;
            const topics = topicsMap[category.id] || [];
            const totalProblems = category.totalProblems || 0;
            const solvedCount = pathSolvedCounts[category.id] || 0;
            const progressPercent = totalProblems > 0 ? Math.round((solvedCount / totalProblems) * 100) : 0;

            return (
              <div
                key={category.id}
                className="bg-[#222225] border border-[rgba(241,238,234,0.1)] rounded-[6px] overflow-hidden cursor-pointer tile-interactive group"
                onClick={() => onPathClick(category.id)}
                style={{ '--i': tileIndex } as CSSProperties}
              >
                <div className="p-6">
                  {/* Icon & Title */}
                  <div className="flex items-start justify-between mb-4">
                    <div className="w-10 h-10 rounded-[4px] bg-[#2c2b30] flex items-center justify-center">
                      <Icon
                        className="w-5 h-5 text-[#f0997d]"
                      />
                    </div>
                    <div className="flex items-center gap-1 text-[#8f8a85]">
                      <span className="text-[0.75rem] tnum">{topics.length} topics</span>
                    </div>
                  </div>

                  <h3 className="text-[1.125rem] font-medium text-[#f1eeea] mb-2">
                    {category.title}
                  </h3>
                  <p className="text-[#b6b1ad] text-[0.8125rem] leading-relaxed mb-4 line-clamp-2">
                    {category.description}
                  </p>

                  {/* Progress */}
                  <div className="mb-4">
                    <div className="flex items-center justify-between text-[0.75rem] mb-2">
                      <span className="text-[#8f8a85]">Progress</span>
                      <span className="text-[#b6b1ad] tnum">{solvedCount}/{totalProblems}</span>
                    </div>
                    <div className="h-1 bg-[rgba(241,238,234,0.1)] overflow-hidden">
                      <div
                        className="h-full bg-[#f0997d]"
                        style={{ width: `${progressPercent}%` }}
                      />
                    </div>
                  </div>

                  {/* Topics Preview */}
                  <div className="space-y-2">
                    {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                    {topics.slice(0, 3).map((topic: any) => (
                      <div
                        key={topic.id}
                        className="flex items-center gap-2 text-[0.8125rem] text-[#b6b1ad]"
                      >
                        <PlayCircle className="w-3.5 h-3.5 text-[#8f8a85] shrink-0" />
                        <span className="truncate">{topic.title}</span>
                      </div>
                    ))}
                    {topics.length > 3 && (
                      <div className="text-[0.8125rem] text-[#8f8a85] pl-6 tnum">
                        +{topics.length - 3} more topics
                      </div>
                    )}
                  </div>

                  {/* CTA */}
                  <div className="mt-6 pt-4 border-t border-[rgba(241,238,234,0.1)]">
                    <button
                      className="btn-quiet -ml-3 text-[0.8125rem]"
                    >
                      Start learning
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Stats Row — figures on hairlines */}
        <div className="mt-16 grid grid-cols-2 md:grid-cols-4 border-t border-b border-[rgba(241,238,234,0.2)]">
          {[
            { label: 'Total problems', value: problemCount },
            { label: 'Video solutions', value: videoCount },
            { label: 'Learning paths', value: roadmapCount },
            { label: 'Active learners', value: userCount }
          ].map((stat) => (
            <div
              key={stat.label}
              className="px-4 py-3.5 border-r border-[rgba(241,238,234,0.1)] last:border-r-0"
            >
              <p className="text-[1.5rem] font-medium text-[#f1eeea] tnum leading-none mb-1.5">
                {stat.value.toLocaleString()}
              </p>
              <p className="text-[0.75rem] text-[#8f8a85]">{stat.label}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
