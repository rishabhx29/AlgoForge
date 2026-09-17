import { useRef } from 'react';
import { motion, useScroll, useTransform } from 'framer-motion';
import { MapPin, Play, Code2, TrendingUp, CheckCircle2 } from 'lucide-react';

const steps = [
  {
    number: '01',
    title: 'Choose a Roadmap',
    description: 'Select from our curated learning paths based on your goals. Whether you\'re preparing for interviews or learning DSA from scratch.',
    icon: MapPin,
    color: '#a088ff'
  },
  {
    number: '02',
    title: 'Watch & Learn',
    description: 'Watch high-quality video explanations for each topic. Our instructors break down complex concepts into easy-to-understand lessons.',
    icon: Play,
    color: '#63e3ff'
  },
  {
    number: '03',
    title: 'Practice Daily',
    description: 'Solve problems on LeetCode, CodeStudio, and other platforms. Apply what you\'ve learned with hands-on practice.',
    icon: Code2,
    color: '#ff8a63'
  },
  {
    number: '04',
    title: 'Track Progress',
    description: 'Monitor your growth with detailed analytics. See your streak, completion rate, and areas that need more focus.',
    icon: TrendingUp,
    color: '#88ff9f'
  }
];


interface HowItWorksProps {
  onGetStarted?: () => void;
}

export function HowItWorks({ onGetStarted }: Readonly<HowItWorksProps>) {
  const containerRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ['start end', 'end start']
  });

  const pathLength = useTransform(scrollYProgress, [0, 1], [0, 1]);

  return (
    <section ref={containerRef} id="how-it-works" className="relative py-24 overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 grid-pattern opacity-20" />

      <div className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-20"
        >
          <h2 className="font-display text-4xl sm:text-5xl text-white mb-4">
            How It <span className="gradient-text">Works</span>
          </h2>
          <p className="text-lg text-white/60 max-w-2xl mx-auto">
            Start your coding journey in four simple steps.
            Our structured approach ensures you learn effectively.
          </p>
        </motion.div>

        {/* Steps */}
        <div className="relative">
          {/* Connecting Line - Desktop */}
          <svg
            className="absolute left-1/2 top-0 h-full w-2 -translate-x-1/2 hidden lg:block"
            viewBox="0 0 2 100"
            preserveAspectRatio="none"
          >
            <motion.path
              d="M1 0 L1 100"
              stroke="url(#gradient)"
              strokeWidth="2"
              fill="none"
              strokeLinecap="round"
              style={{ pathLength }}
            />
            <defs>
              <linearGradient id="gradient" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#a088ff" />
                <stop offset="33%" stopColor="#63e3ff" />
                <stop offset="66%" stopColor="#ff8a63" />
                <stop offset="100%" stopColor="#88ff9f" />
              </linearGradient>
            </defs>
          </svg>

          <div className="space-y-16 lg:space-y-24">
            {steps.map((step, index) => (
              <motion.div
                key={step.number}
                initial={{ opacity: 0, x: index % 2 === 0 ? -50 : 50 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true, margin: '-100px' }}
                transition={{ duration: 0.6, delay: index * 0.1 }}
                className={`relative flex flex-col lg:flex-row items-center gap-8 ${index % 2 === 1 ? 'lg:flex-row-reverse' : ''
                  }`}
              >
                {/* Content Card */}
                <div className={`flex-1 ${index % 2 === 0 ? 'lg:text-right' : 'lg:text-left'}`}>
                  <div className="glass rounded-2xl p-6 sm:p-8 inline-block max-w-lg">
                    <div className={`flex items-center gap-4 mb-4 ${index % 2 === 0 ? 'lg:flex-row-reverse' : ''}`}>
                      <div
                        className="w-12 h-12 rounded-xl flex items-center justify-center"
                        style={{ background: `${step.color}20` }}
                      >
                        <step.icon className="w-6 h-6" style={{ color: step.color }} />
                      </div>
                      <span
                        className="font-display text-4xl"
                        style={{ color: step.color }}
                      >
                        {step.number}
                      </span>
                    </div>
                    <h3 className="text-2xl font-semibold text-white mb-3">
                      {step.title}
                    </h3>
                    <p className="text-white/60 leading-relaxed">
                      {step.description}
                    </p>
                  </div>
                </div>

                {/* Center Node */}
                <div className="relative flex-shrink-0">
                  <motion.div
                    whileHover={{ scale: 1.2 }}
                    className="w-16 h-16 rounded-full flex items-center justify-center z-10 relative"
                    style={{
                      background: `linear-gradient(135deg, ${step.color}, ${step.color}80)`,
                      boxShadow: `0 0 30px ${step.color}50`
                    }}
                  >
                    <CheckCircle2 className="w-8 h-8 text-white" />
                  </motion.div>
                  {/* Pulse Ring */}
                  <motion.div
                    animate={{ scale: [1, 1.5, 1], opacity: [0.5, 0, 0.5] }}
                    transition={{ duration: 2, repeat: Infinity }}
                    className="absolute inset-0 rounded-full"
                    style={{ background: step.color }}
                  />
                </div>

                {/* Spacer for alternating layout */}
                <div className="flex-1 hidden lg:block" />
              </motion.div>
            ))}
          </div>
        </div>

        {/* Bottom CTA */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="mt-20 text-center"
        >
          <p className="text-white/60 mb-4">Ready to start your journey?</p>
          <button
            onClick={onGetStarted}
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-[#a088ff] to-[#63e3ff] text-[#141414] font-medium hover:opacity-90 transition-opacity"
          >
            Get Started Now
            <TrendingUp className="w-5 h-5" />
          </button>
        </motion.div>
      </div>
    </section>
  );
}
