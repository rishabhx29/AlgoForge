import { useRef } from 'react';
import { motion, useScroll, useTransform } from 'framer-motion';
import { MapPin, Play, Code2, TrendingUp, CheckCircle2 } from 'lucide-react';

const steps = [
  {
    number: '01',
    title: 'Choose a Roadmap',
    description: 'Select from our curated learning paths based on your goals. Whether you\'re preparing for interviews or learning DSA from scratch.',
    icon: MapPin
  },
  {
    number: '02',
    title: 'Watch & Learn',
    description: 'Watch high-quality video explanations for each topic. Our instructors break down complex concepts into easy-to-understand lessons.',
    icon: Play
  },
  {
    number: '03',
    title: 'Practice Daily',
    description: 'Solve problems on LeetCode, CodeStudio, and other platforms. Apply what you\'ve learned with hands-on practice.',
    icon: Code2
  },
  {
    number: '04',
    title: 'Track Progress',
    description: 'Monitor your growth with detailed analytics. See your streak, completion rate, and areas that need more focus.',
    icon: TrendingUp
  }
];


interface HowItWorksProps {
  onGetStarted?: () => void;
}

export function HowItWorks({ onGetStarted }: HowItWorksProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ['start end', 'end start']
  });

  const pathLength = useTransform(scrollYProgress, [0, 1], [0, 1]);

  return (
    <section ref={containerRef} id="how-it-works" className="relative py-24">
      <div className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="max-w-2xl mb-20">
          <h2 className="font-display text-4xl sm:text-5xl text-[#f1eeea] mb-4 tracking-[-0.015em]">
            How It Works
          </h2>
          <p className="text-[0.9375rem] text-[#b6b1ad] leading-relaxed">
            Start your coding journey in four simple steps.
            Our structured approach ensures you learn effectively.
          </p>
        </div>

        <div className="relative">
          <svg
            className="absolute left-1/2 top-0 h-full w-2 -translate-x-1/2 hidden lg:block"
            viewBox="0 0 2 100"
            preserveAspectRatio="none"
            aria-hidden="true"
          >
            <motion.path
              d="M1 0 L1 100"
              stroke="rgba(241,238,234,0.2)"
              strokeWidth="2"
              fill="none"
              strokeLinecap="round"
              style={{ pathLength }}
            />
          </svg>

          <div className="space-y-16 lg:space-y-24">
            {steps.map((step, index) => (
              <div
                key={step.number}
                className={`relative flex flex-col lg:flex-row items-center gap-8 ${index % 2 === 1 ? 'lg:flex-row-reverse' : ''
                  }`}
              >
                <div className={`flex-1 ${index % 2 === 0 ? 'lg:text-right' : 'lg:text-left'}`}>
                  <div className="rounded-[6px] p-6 sm:p-8 inline-block max-w-lg bg-[#222225] border border-[rgba(241,238,234,0.1)]">
                    <div className={`flex items-center gap-4 mb-4 ${index % 2 === 0 ? 'lg:flex-row-reverse' : ''}`}>
                      <div className="w-12 h-12 rounded-[4px] flex items-center justify-center bg-[#2c2b30] border border-[rgba(241,238,234,0.1)]">
                        <step.icon className="w-5 h-5 text-[#b6b1ad]" aria-hidden="true" />
                      </div>
                      <span className="font-display text-4xl tnum text-[#f0997d]">
                        {step.number}
                      </span>
                    </div>
                    <h3 className="text-[1.125rem] font-medium text-[#f1eeea] mb-3">
                      {step.title}
                    </h3>
                    <p className="text-[0.9375rem] text-[#b6b1ad] leading-relaxed">
                      {step.description}
                    </p>
                  </div>
                </div>

                <div className="relative flex-shrink-0">
                  <div className="w-12 h-12 rounded-[6px] flex items-center justify-center z-10 relative bg-[#2c2b30] border border-[rgba(241,238,234,0.2)]">
                    <CheckCircle2 className="w-5 h-5 text-[#b1cbbb]" aria-hidden="true" />
                  </div>
                </div>

                <div className="flex-1 hidden lg:block" />
              </div>
            ))}
          </div>
        </div>

        <div className="mt-20">
          <p className="text-[0.9375rem] text-[#b6b1ad] mb-4">Ready to start your journey?</p>
          <button onClick={onGetStarted} className="btn-primary">
            Get Started Now
            <TrendingUp className="w-4 h-4" aria-hidden="true" />
          </button>
        </div>
      </div>
    </section>
  );
}
