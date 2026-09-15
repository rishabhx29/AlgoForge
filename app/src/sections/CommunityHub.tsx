import type { CSSProperties } from 'react';

import { MessageSquare, HelpCircle, Share2, Users, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface CommunityHubProps {
    onNavigate: (view: 'home' | 'community') => void;
}

const communityCards = [
    {
        icon: MessageSquare,
        title: 'Discussions',
        description: 'Join topic-based discussions with fellow learners. Share insights, debate approaches, and grow together.',
        stat: 'Active Threads'
    },
    {
        icon: HelpCircle,
        title: 'Ask a Question',
        description: 'Stuck on a problem? Post your question and get help from the community. No question is too basic.',
        stat: 'Quick Answers'
    },
    {
        icon: Share2,
        title: 'Share Solutions',
        description: 'Solved a tricky problem? Share your approach with others. Teaching is the best way to learn.',
        stat: 'Solutions Shared'
    },
    {
        icon: Users,
        title: 'Community Feed',
        description: 'See what other learners are working on. Get inspired, stay motivated, and find study partners.',
        stat: 'Active Members'
    }
];

export function CommunityHub({ onNavigate }: CommunityHubProps) {
    return (
        <section id="community" className="relative py-24">
            <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                {/* Section Header */}
                <div className="max-w-2xl mb-16">
                    <h2 className="font-display text-4xl sm:text-5xl text-[#f1eeea] mb-4 tracking-[-0.015em]">
                        Join the Community
                    </h2>
                    <p className="text-[0.9375rem] text-[#b6b1ad] leading-relaxed">
                        Connect with thousands of developers. Discuss algorithms, share solutions,
                        ask questions, and learn from each other.
                    </p>
                </div>

                {/* Community Cards Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 stagger">
                    {communityCards.map((card, cardIndex) => (
                        <div
                            key={card.title}
                            className="h-full cursor-pointer group p-6 rounded-[6px] bg-[#222225] border border-[rgba(241,238,234,0.1)] tile-interactive"
                            onClick={() => onNavigate('community')}
                            style={{ '--i': cardIndex } as CSSProperties}
                        >
                            <div className="flex items-center gap-3 mb-4">
                                <span className="mark" data-tone="soft" aria-hidden="true" />
                                <card.icon className="w-5 h-5 text-[#b6b1ad]" aria-hidden="true" />
                            </div>

                            <h3 className="text-[1.125rem] font-medium text-[#f1eeea] mb-2 group-hover:text-[#f0997d] transition-colors">
                                {card.title}
                            </h3>
                            <p className="text-[0.875rem] text-[#b6b1ad] leading-relaxed mb-4">
                                {card.description}
                            </p>
                            <div className="flex items-center gap-1 text-[0.75rem] font-medium text-[#8f8a85]">
                                <span>{card.stat}</span>
                                <ArrowRight className="w-3 h-3 group-hover:translate-x-1 transition-transform" aria-hidden="true" />
                            </div>
                        </div>
                    ))}
                </div>

                {/* Explore CTA */}
                <div className="mt-12">
                    <Button
                        variant="outline"
                        size="lg"
                        onClick={() => onNavigate('community')}
                        className="btn-secondary"
                    >
                        Explore Community
                        <ArrowRight className="w-4 h-4" aria-hidden="true" />
                    </Button>
                </div>
            </div>
        </section>
    );
}
