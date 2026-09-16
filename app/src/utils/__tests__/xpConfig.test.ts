import { describe, it, expect } from 'vitest';
import { SOLVE_XP, XP_PER_LEVEL, calculateLevel } from '@/utils/xpConfig';

describe('xpConfig', () => {
  it('exposes the documented XP constants', () => {
    expect(SOLVE_XP).toBe(25);
    expect(XP_PER_LEVEL).toBe(1000);
  });

  it('maps XP to level with the documented formula (floor(xp/1000) + 1)', () => {
    expect(calculateLevel(0)).toBe(1);
    expect(calculateLevel(1)).toBe(1);
    expect(calculateLevel(999)).toBe(1);
    expect(calculateLevel(1000)).toBe(2);
    expect(calculateLevel(1999)).toBe(2);
    expect(calculateLevel(2000)).toBe(3);
    expect(calculateLevel(10_000)).toBe(11);
  });

  it('never returns a level below 1 for negative input', () => {
    // Un-solving decrements XP; inconsistent data must not render "Level 0".
    expect(calculateLevel(-500)).toBe(1);
    expect(calculateLevel(-1)).toBe(1);
  });

  it('treats non-finite XP as zero rather than producing NaN', () => {
    expect(calculateLevel(NaN)).toBe(1);
    expect(calculateLevel(Infinity)).toBe(1);
    expect(calculateLevel(-Infinity)).toBe(1);
  });

  it('is consistent with SOLVE_XP increments', () => {
    // 40 solved problems = 1000 XP = level 2
    const xpFromSolving = SOLVE_XP * 40;
    expect(calculateLevel(xpFromSolving)).toBe(2);
  });
});
