import { Footprints, Star, Crown, Flame, BookOpen, Award } from 'lucide-react';

/**
 * Badge definitions — one source for every surface that shows them.
 *
 * These were previously declared twice: once on the dashboard with icon
 * components, and once on the profile with emoji (🎯 ⚡ 🔥 ✨). The two lists
 * disagreed — 10 solved earned "Rising Star" on the dashboard and "Problem
 * solver" on the profile — and emoji sat badly beside the rest of the icon
 * system, which is drawn, not typed.
 *
 * Each badge states what it requires, so a locked badge can say what is missing
 * instead of only being dimmed.
 */

export interface BadgeStats {
  solved: number;
  streak: number;
}

export interface BadgeDef {
  id: string;
  name: string;
  Icon: BadgeIcon;
  /** Shown on a locked badge, so the requirement is never a mystery. */
  requires: string;
  earned: (stats: BadgeStats) => boolean;
}

/* `typeof Footprints` rather than importing a `LucideIcon` type, which is not
 * part of the package's public export surface. Every lucide icon shares this
 * signature. */
export type BadgeIcon = typeof Footprints;

export const BADGES: BadgeDef[] = [
  {
    id: 'first-steps',
    name: 'First Steps',
    Icon: Footprints,
    requires: 'Solve 1 problem',
    earned: (s) => s.solved >= 1,
  },
  {
    id: 'rising-star',
    name: 'Rising Star',
    Icon: Star,
    requires: 'Solve 10 problems',
    earned: (s) => s.solved >= 10,
  },
  {
    id: 'streak-master',
    name: 'Streak Master',
    Icon: Flame,
    requires: 'A 3-day streak',
    earned: (s) => s.streak >= 3,
  },
  {
    id: 'scholar',
    name: 'Scholar',
    Icon: BookOpen,
    requires: 'Solve 25 problems',
    earned: (s) => s.solved >= 25,
  },
  {
    id: 'champion',
    name: 'Champion',
    Icon: Crown,
    requires: 'Solve 50 problems',
    earned: (s) => s.solved >= 50,
  },
  {
    id: 'elite',
    name: 'Elite',
    Icon: Award,
    requires: 'Solve 100 problems',
    earned: (s) => s.solved >= 100,
  },
];

export const countEarned = (stats: BadgeStats) => BADGES.filter((b) => b.earned(stats)).length;
