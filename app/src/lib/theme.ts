/**
 * Shared design tokens.
 *
 * The accent palette was previously copy-pasted as hex literals across every
 * section (Hero, Roadmaps, Leaderboard, Dashboard, ...). Centralising it here
 * means a palette change is one edit instead of dozens.
 */

/** Brand accent colors used for gradients, glows and icons. */
export const ACCENT = {
    purple: '#a088ff',
    cyan: '#63e3ff',
    orange: '#ff8a63',
    green: '#88ff9f',
    pink: '#ff88c9',
    gold: '#ffd700',
    emerald: '#7ca700',
} as const;

/** Base surface colors. */
export const SURFACE = {
    /** App background. */
    base: '#141414',
    /** Raised panel / card background. */
    card: '#202020',
    /** Recessed / deep background (admin, console). */
    deep: '#0a0a0a',
} as const;

/** Per-difficulty accent, used by list badges, bars and dots. */
export const DIFFICULTY_COLOR: Record<string, string> = {
    Easy: '#22c55e',
    Medium: '#eab308',
    Hard: '#ef4444',
};

/** Fallback accent for anything without an explicit color. */
export const DEFAULT_ACCENT = ACCENT.purple;

/** Difficulty accent with a safe fallback for unexpected values. */
export function difficultyColor(difficulty: string | undefined): string {
    return DIFFICULTY_COLOR[difficulty ?? ''] ?? DIFFICULTY_COLOR.Hard;
}