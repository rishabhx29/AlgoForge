
import { useRef, useState, useEffect } from 'react';
import { motion, useScroll, useTransform } from 'framer-motion';
import { ArrowRight, Users, Star, Terminal, Cpu } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useStats } from '@/hooks/useStats';


interface HeroProps {
  onGetStarted: () => void;
}

const WORDS = ['Algorithms', 'System Design', 'Data Structures', 'Problem Solving'];

function TypewriterText() {
  const [index, setIndex] = useState(0);
  const [subIndex, setSubIndex] = useState(0);
  const [reverse, setReverse] = useState(false);
  const [blink, setBlink] = useState(true);

  // Blinking cursor
  useEffect(() => {
    const timeout2 = setInterval(() => {
      setBlink((prev) => !prev);
    }, 500);
    return () => clearInterval(timeout2);
  }, []);

  // Typing logic
  useEffect(() => {
    if (subIndex === WORDS[index].length + 1 && !reverse) {
      setTimeout(() => setReverse(true), 0);
      return;
    }

    if (subIndex === 0 && reverse) {
      setTimeout(() => {
        setReverse(false);
        setIndex((prev) => (prev + 1) % WORDS.length);
      }, 0);
      return;
    }

    const timeout = setTimeout(() => {
      setSubIndex((prev) => prev + (reverse ? -1 : 1));
    }, reverse ? 75 : Math.random() * 50 + 100);

    return () => clearTimeout(timeout);
  }, [subIndex, index, reverse]);

  return (
    <span className="gradient-text inline-block min-w-[300px] text-left">
      {WORDS[index].substring(0, subIndex)}
      <span className={`${blink ? 'opacity-100' : 'opacity-0'} ml-1 text-white`}>|</span>
    </span>
  );
}

function CodeWindow() {
  const codeSnippet = `function binarySearch(arr, target) {
  let left = 0;
  let right = arr.length - 1;

  while (left <= right) {
    const mid = Math.floor((left + right) / 2);
    
    if (arr[mid] === target) {
      return mid; // Found!
    }
    
    if (arr[mid] < target) {
      left = mid + 1;
    } else {
      right = mid - 1;
    }
  }
  return -1;
}`;

  const [displayedCode, setDisplayedCode] = useState('');

  useEffect(() => {
    let i = 0;
    const interval = setInterval(() => {
      setDisplayedCode(codeSnippet.substring(0, i));
      i++;
      if (i > codeSnippet.length) {
        clearInterval(interval);
      }
    }, 30);
    return () => clearInterval(interval);
  }, [codeSnippet]);

  return (
    <div className="glass rounded-xl overflow-hidden shadow-2xl border border-white/10 w-full max-w-lg mx-auto text-left">
      {/* Window Header */}
      <div className="bg-[#1a1a1a] px-4 py-3 flex items-center justify-between border-b border-white/5">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-red-500/80" />
          <div className="w-3 h-3 rounded-full bg-yellow-500/80" />
          <div className="w-3 h-3 rounded-full bg-green-500/80" />
        </div>
        <div className="text-xs text-white/40 font-mono">search.js</div>
      </div>
      {/* Code Area */}
      <div className="p-6 bg-[#0f0f0f]/90 overflow-hidden h-[300px]">
        <pre className="font-mono text-sm leading-relaxed">
          <code className="text-blue-400">
            {displayedCode.split('\n').map((line, i) => (
              <div key={i} className="table-row">
                <span className="table-cell select-none text-white/20 pr-4 text-right w-8">{i + 1}</span>
                <span dangerouslySetInnerHTML={{
                  __html: line
                    .replace(/function|return|while|if|else/g, '<span class="text-purple-400">$&</span>')
                    .replace(/const|let/g, '<span class="text-blue-400">$&</span>')
                    .replace(/arr|target|left|right|mid/g, '<span class="text-yellow-200">$&</span>')
                    .replace(/\/\/.*/g, '<span class="text-green-400">$&</span>')
                }} />
              </div>
            ))}
          </code>
        </pre>
      </div>
    </div>
  );
}

export function Hero({ onGetStarted }: HeroProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ['start start', 'end start']
  });

  const y = useTransform(scrollYProgress, [0, 1], [0, 200]);
  const opacity = useTransform(scrollYProgress, [0, 0.5], [1, 0]);
  const scale = useTransform(scrollYProgress, [0, 0.5], [1, 0.9]);

  const { userCount, problemCount } = useStats();

  return (
    <section
      id="home"
      ref={containerRef}
      className="relative min-h-screen flex items-center justify-center overflow-hidden pt-20"
    >
      {/* Background Pattern */}
      <div className="absolute inset-0 isometric-pattern opacity-50" />

      {/* Animated Gradient Orbs */}
      <motion.div
        animate={{
          x: [0, 50, 0],
          y: [0, -30, 0],
          scale: [1, 1.1, 1]
        }}
        transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
        className="absolute top-1/4 left-1/4 w-96 h-96 bg-[#a088ff]/10 rounded-full blur-[100px]"
      />
      <motion.div
        animate={{
          x: [0, -40, 0],
          y: [0, 40, 0],
          scale: [1, 1.2, 1]
        }}
        transition={{ duration: 10, repeat: Infinity, ease: 'easeInOut' }}
        className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-[#63e3ff]/10 rounded-full blur-[100px]"
      />

      {/* Grid Lines */}
      <div className="absolute inset-0 grid-pattern-moving opacity-30" />

      {/* Content */}
      <motion.div
        style={{ y, opacity, scale }}
        className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8"
      >
        <div className="flex flex-col lg:flex-row items-center gap-12 lg:gap-20">

          {/* Text Content */}
          <div className="flex-1 text-center lg:text-left">
            {/* Heading */}
            <motion.h1
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.1 }}
              className="font-display text-5xl sm:text-6xl md:text-7xl text-white mb-6 leading-tight"
            >
              Master <br />
              <TypewriterText />
            </motion.h1>

            {/* Subheading */}
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.3 }}
              className="text-lg sm:text-xl text-white/60 mb-10 max-w-2xl mx-auto lg:mx-0"
            >
              Structured learning paths for Data Structures, Algorithms, and Interview Preparation.
              Track your progress, take notes, and level up your skills.
            </motion.p>

            {/* CTA Buttons */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.5 }}
              className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-4 mb-12"
            >
              <Button
                size="lg"
                onClick={onGetStarted}
                className="btn-shine bg-gradient-to-r from-[#a088ff] to-[#63e3ff] text-[#141414] hover:opacity-90 px-8 py-6 text-lg font-medium rounded-xl group relative overflow-hidden"
              >
                <span className="relative z-10 flex items-center">
                  Get Started Free
                  <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </span>
              </Button>

            </motion.div>

            {/* Stats */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.7 }}
              className="flex flex-wrap items-center justify-center lg:justify-start gap-8 sm:gap-12"
            >
              <div className="flex items-center gap-2">
                <Users className="w-5 h-5 text-[#a088ff]" />
                <span className="text-white/80">
                  <span className="font-semibold text-white">{userCount}</span> Learners
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Star className="w-5 h-5 text-[#63e3ff]" />
                <span className="text-white/80">
                  <span className="font-semibold text-white">{problemCount}</span> Problems
                </span>
              </div>
            </motion.div>
          </div>

          {/* Visual Content (Laptop/Code) */}
          <div className="flex-1 w-full max-w-[600px] lg:max-w-none relative hidden md:block">
            <motion.div
              initial={{ opacity: 0, scale: 0.8, rotateY: -15 }}
              animate={{ opacity: 1, scale: 1, rotateY: 0 }}
              transition={{ duration: 1, delay: 0.2 }}
              style={{ perspective: 1000 }}
              className="relative z-20"
            >
              <CodeWindow />
            </motion.div>

            {/* Floating Elements Background */}
            <motion.div
              animate={{ y: [0, -20, 0] }}
              transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
              className="absolute -top-10 -right-10 bg-[#202020] p-4 rounded-xl border border-white/10 shadow-xl z-10 glass"
            >
              <Cpu className="w-8 h-8 text-[#a088ff]" />
            </motion.div>

            <motion.div
              animate={{ y: [0, 20, 0] }}
              transition={{ duration: 7, repeat: Infinity, ease: 'easeInOut', delay: 1 }}
              className="absolute -bottom-5 -left-5 bg-[#202020] p-4 rounded-xl border border-white/10 shadow-xl z-30 glass"
            >
              <Terminal className="w-8 h-8 text-[#63e3ff]" />
            </motion.div>
          </div>

        </div>
      </motion.div>

      {/* Bottom Gradient */}
      <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-[#141414] to-transparent pointer-events-none" />
    </section>
  );
}

