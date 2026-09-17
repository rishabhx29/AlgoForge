import { useRef, useState, type ReactNode } from 'react';

interface SpotlightCardProps {
    children: ReactNode;
    className?: string;
    /** Accent color for the radial spotlight that follows the cursor. */
    color?: string;
}

/**
 * Card with a cursor-following radial spotlight.
 *
 * Was duplicated verbatim in Features and CommunityHub; both now share this
 * implementation so the interaction can only be fixed in one place.
 */
export function SpotlightCard({ children, className = '', color = '#ffffff' }: SpotlightCardProps) {
    const divRef = useRef<HTMLDivElement>(null);
    const [position, setPosition] = useState({ x: 0, y: 0 });
    const [opacity, setOpacity] = useState(0);

    const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
        if (!divRef.current) return;
        const rect = divRef.current.getBoundingClientRect();
        setPosition({ x: e.clientX - rect.left, y: e.clientY - rect.top });
    };

    return (
        <div
            ref={divRef}
            onMouseMove={handleMouseMove}
            onMouseEnter={() => setOpacity(1)}
            onMouseLeave={() => setOpacity(0)}
            className={`relative overflow-hidden rounded-2xl border border-white/5 bg-white/5 ${className}`}
        >
            <div
                className="pointer-events-none absolute -inset-px transition duration-300 z-10"
                style={{
                    opacity,
                    background: `radial-gradient(600px circle at ${position.x}px ${position.y}px, ${color}15, transparent 40%)`,
                }}
            />
            {children}
        </div>
    );
}