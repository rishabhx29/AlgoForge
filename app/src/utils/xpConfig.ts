/**
 * XP and Level Configuration
 *
 * Central source of truth for all XP values and level calculations.
 * Change these values once — they propagate everywhere.
 */

/** XP awarded for solving a problem */
export const SOLVE_XP = 25;

/** XP required per level */
export const XP_PER_LEVEL = 1000;

/**
 * Calculate a user's level from their total XP.
 * Formula: level = floor(xp / XP_PER_LEVEL) + 1
 *
 * XP is clamped at 0 so a negative or non-finite value can never produce a
 * level below 1 (un-solving a problem decrements XP and inconsistent data
 * must not surface as "Level 0" in the UI).
 */
export function calculateLevel(xpPoints: number): number {
  const safeXp = Number.isFinite(xpPoints) ? Math.max(0, xpPoints) : 0;
  return Math.floor(safeXp / XP_PER_LEVEL) + 1;
}
