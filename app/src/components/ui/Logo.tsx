
import { motion } from 'framer-motion';

export function Logo({ className = "", size = 40 }: Readonly<{ className?: string; size?: number }>) {
    return (
        <motion.svg
            width={size}
            height={size}
            viewBox="0 0 100 100"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className={className}
        >
            <defs>
                <linearGradient id="primary-grad" x1="0" y1="0" x2="100" y2="100" gradientUnits="userSpaceOnUse">
                    <stop stopColor="#a088ff" />
                    <stop offset="1" stopColor="#63e3ff" />
                </linearGradient>
                <linearGradient id="accent-grad" x1="100" y1="0" x2="0" y2="100" gradientUnits="userSpaceOnUse">
                    <stop stopColor="#ffffff" />
                    <stop offset="1" stopColor="#a088ff" />
                </linearGradient>
                <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
                    <feGaussianBlur stdDeviation="3" result="blur" />
                    <feComposite in="SourceGraphic" in2="blur" operator="over" />
                </filter>
            </defs>

            {/* Plate 1: Left */}
            <motion.path
                d="M30 20 L50 30 L50 70 L30 80 L10 70 V30 L30 20 Z"
                fill="url(#primary-grad)"
                fillOpacity="0.8"
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.8, delay: 0.1 }}
            />
            {/* Detail Line Left */}
            <path d="M30 20 L30 80" stroke="rgba(255,255,255,0.2)" strokeWidth="1" />
            <path d="M10 30 L30 40 L50 30" stroke="rgba(255,255,255,0.2)" strokeWidth="1" />

            {/* Plate 2: Right Top */}
            <motion.path
                d="M70 20 L90 30 V50 L70 60 L50 50 V30 L70 20 Z"
                fill="url(#primary-grad)"
                fillOpacity="0.6"
                initial={{ opacity: 0, x: 10, y: -10 }}
                animate={{ opacity: 1, x: 0, y: 0 }}
                transition={{ duration: 0.8, delay: 0.2 }}
            />
            {/* Detail Line Top Right */}
            <path d="M50 30 L70 40 L90 30" stroke="rgba(255,255,255,0.2)" strokeWidth="1" />

            {/* Plate 3: Right Bottom */}
            <motion.path
                d="M70 60 L90 70 V90 L70 80 L50 90 V70 L70 60 Z"
                fill="url(#primary-grad)"
                fillOpacity="0.9"
                initial={{ opacity: 0, x: 10, y: 10 }}
                animate={{ opacity: 1, x: 0, y: 0 }}
                transition={{ duration: 0.8, delay: 0.3 }}
            />
            {/* Detail Line Bottom Right */}
            <path d="M50 70 L70 80 L90 70" stroke="rgba(255,255,255,0.2)" strokeWidth="1" />

            {/* Central Core / Fusion Point */}
            <motion.circle
                cx="50"
                cy="50"
                r="8"
                fill="white"
                filter="url(#glow)"
                initial={{ scale: 0 }}
                animate={{ scale: [0.8, 1.2, 0.8] }}
                transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
            />

            {/* Connecting Data Streams */}
            <path d="M30 40 L50 50" stroke="url(#accent-grad)" strokeWidth="2" strokeLinecap="round" opacity="0.8" />
            <path d="M70 40 L50 50" stroke="url(#accent-grad)" strokeWidth="2" strokeLinecap="round" opacity="0.8" />
            <path d="M70 80 L50 50" stroke="url(#accent-grad)" strokeWidth="2" strokeLinecap="round" opacity="0.8" />

        </motion.svg>
    );
}
