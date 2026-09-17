
import { motion } from 'framer-motion';
import { MessageSquare, HelpCircle, Share2, Users, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { SpotlightCard } from '@/components/custom/SpotlightCard';

interface CommunityHubProps {
    onNavigate: (view: 'home' | 'community') => void;
}

const communityCards = [
    {
        icon: MessageSquare,
        title: 'Discussions',
        description: 'Join topic-based discussions with fellow learners. Share insights, debate approaches, and grow together.',
        color: '#a088ff',
        stat: 'Active Threads'
    },
    {
        icon: HelpCircle,
        title: 'Ask a Question',
        description: 'Stuck on a problem? Post your question and get help from the community. No question is too basic.',
        color: '#63e3ff',
        stat: 'Quick Answers'
    },
    {
        icon: Share2,
        title: 'Share Solutions',
        description: 'Solved a tricky problem? Share your approach with others. Teaching is the best way to learn.',
        color: '#ff8a63',
        stat: 'Solutions Shared'
    },
    {
        icon: Users,
        title: 'Community Feed',
        description: 'See what other learners are working on. Get inspired, stay motivated, and find study partners.',
        color: '#88ff9f',
        stat: 'Active Members'
    }
];

export function CommunityHub({ onNavigate }: CommunityHubProps) {
    return (
        <section id="community" className="relative py-24 overflow-hidden">
            {/* Background */}
            <div className="absolute inset-0 isometric-pattern opacity-20" />
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-[#a088ff]/5 rounded-full blur-[150px]" />

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
                        Join the <span className="gradient-text">Community</span>
                    </h2>
                    <p className="text-lg text-white/60 max-w-2xl mx-auto">
                        Connect with thousands of developers. Discuss algorithms, share solutions,
                        ask questions, and learn from each other.
                    </p>
                </motion.div>

                {/* Community Cards Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    {communityCards.map((card, index) => (
                        <motion.div
                            key={card.title}
                            initial={{ opacity: 0, y: 50 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{
                                duration: 0.6,
                                delay: index * 0.1,
                                ease: [0.16, 1, 0.3, 1] as const
                            }}
                            className="h-full cursor-pointer group"
                            onClick={() => onNavigate('community')}
                        >
                            <SpotlightCard className="h-full p-6" color={card.color}>
                                {/* Icon */}
                                <motion.div
                                    whileHover={{ rotate: 5, scale: 1.1 }}
                                    className="w-14 h-14 rounded-xl flex items-center justify-center mb-4 relative z-20"
                                    style={{ background: `${card.color}20` }}
                                >
                                    <card.icon
                                        className="w-7 h-7"
                                        style={{ color: card.color }}
                                    />
                                </motion.div>

                                {/* Content */}
                                <div className="relative z-20">
                                    <h3 className="text-xl font-semibold text-white mb-2 group-hover:text-[#a088ff] transition-colors">
                                        {card.title}
                                    </h3>
                                    <p className="text-white/60 text-sm leading-relaxed mb-4">
                                        {card.description}
                                    </p>
                                    <div className="flex items-center gap-1 text-xs font-medium" style={{ color: card.color }}>
                                        <span>{card.stat}</span>
                                        <ArrowRight className="w-3 h-3 group-hover:translate-x-1 transition-transform" />
                                    </div>
                                </div>

                                {/* Hover Glow */}
                                <div
                                    className="absolute -bottom-10 -right-10 w-32 h-32 rounded-full blur-[50px] opacity-0 group-hover:opacity-40 transition-opacity duration-500 pointer-events-none"
                                    style={{ background: card.color }}
                                />
                            </SpotlightCard>
                        </motion.div>
                    ))}
                </div>

                {/* Explore CTA */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.6, delay: 0.4 }}
                    className="mt-12 text-center"
                >
                    <Button
                        variant="outline"
                        size="lg"
                        onClick={() => onNavigate('community')}
                        className="border-white/10 text-white hover:bg-white/5 hover:text-[#a088ff] transition-colors"
                    >
                        Explore Community
                        <ArrowRight className="ml-2 w-4 h-4" />
                    </Button>
                </motion.div>
            </div>
        </section>
    );
}
