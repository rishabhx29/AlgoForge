
import { motion } from 'framer-motion';
import { Play, Code2, BarChart3, BookOpen, Target, Trophy } from 'lucide-react';
import { useStats } from '@/hooks/useStats';
import { SpotlightCard } from '@/components/custom/SpotlightCard';

export function Features() {
  const { problemCount } = useStats();

  const features = [
    {
      icon: Play,
      title: 'Video Solutions',
      description: 'Watch step-by-step explanations for every problem. Learn from expert instructors with clear, concise videos.',
      color: '#a088ff',
      offset: 0
    },
    {
      icon: Code2,
      title: 'Practice Problems',
      description: `${problemCount} carefully curated problems from easy to hard. Practice with real interview questions from top companies.`,
      color: '#63e3ff',
      offset: 0
    },
    {
      icon: BarChart3,
      title: 'Progress Tracking',
      description: 'Track your learning journey with detailed analytics. See your improvement over time with visual insights.',
      color: '#ff8a63',
      offset: 0
    },
    {
      icon: BookOpen,
      title: 'Personal Notes',
      description: 'Take notes on any problem. Save your learnings and revisit them anytime with our markdown editor.',
      color: '#88ff9f',
      offset: 0
    },
    {
      icon: Target,
      title: 'Daily Challenges',
      description: 'Get a new set of problems every day. Maintain your streak and build consistent learning habits.',
      color: '#ff88c9',
      offset: 0
    },
    {
      icon: Trophy,
      title: 'Gamification',
      description: 'Earn XP, unlock badges, and climb the leaderboard. Make learning fun and competitive.',
      color: '#ffd700',
      offset: 0
    }
  ];

  return (
    <section id="features" className="relative py-24 overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 isometric-pattern opacity-20" />

      {/* Gradient Orbs */}
      <div className="absolute top-1/2 left-0 w-96 h-96 bg-[#a088ff]/10 rounded-full blur-[120px] -translate-y-1/2" />
      <div className="absolute top-1/3 right-0 w-80 h-80 bg-[#63e3ff]/10 rounded-full blur-[100px]" />

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
            Everything You <span className="gradient-text">Need</span>
          </h2>
          <p className="text-lg text-white/60 max-w-2xl mx-auto">
            A complete platform designed to help you master coding interviews
            and become a better programmer.
          </p>
        </motion.div>

        {/* Features Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feature, index) => (
            <motion.div
              key={feature.title}
              initial={{ opacity: 0, y: 50 }}
              whileInView={{ opacity: 1, y: feature.offset }}
              viewport={{ once: true }}
              transition={{
                duration: 0.6,
                delay: index * 0.1,
                ease: [0.16, 1, 0.3, 1] as const
              }}
              className="h-full"
            >
              <SpotlightCard className="h-full p-6" color={feature.color}>
                {/* Holographic Border */}
                <div
                  className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"
                  style={{
                    background: `linear-gradient(135deg, ${feature.color}30, transparent 50%)`,
                    padding: '1px'
                  }}
                />

                {/* Icon */}
                <motion.div
                  whileHover={{ rotate: 5, scale: 1.1 }}
                  className="w-14 h-14 rounded-xl flex items-center justify-center mb-4 relative z-20"
                  style={{ background: `${feature.color}20` }}
                >
                  <feature.icon
                    className="w-7 h-7"
                    style={{ color: feature.color }}
                  />
                </motion.div>

                {/* Content */}
                <div className="relative z-20">
                  <h3 className="text-xl font-semibold text-white mb-2 group-hover:text-[#a088ff] transition-colors">
                    {feature.title}
                  </h3>
                  <p className="text-white/60 text-sm leading-relaxed">
                    {feature.description}
                  </p>
                </div>

                {/* Hover Glow */}
                <div
                  className="absolute -bottom-10 -right-10 w-32 h-32 rounded-full blur-[50px] opacity-0 group-hover:opacity-40 transition-opacity duration-500 pointer-events-none"
                  style={{ background: feature.color }}
                />
              </SpotlightCard>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
