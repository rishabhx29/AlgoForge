import { describe, it, expect } from 'vitest';
import { SOLVE_XP, XP_PER_LEVEL, calculateLevel } from '../src/config/xpConfig';

describe('xpConfig (backend)', () => {
    it('exposes the documented XP constants', () => {
        expect(SOLVE_XP).toBe(25);
        expect(XP_PER_LEVEL).toBe(1000);
    });

    it('maps XP to level with the documented formula', () => {
        expect(calculateLevel(0)).toBe(1);
        expect(calculateLevel(999)).toBe(1);
        expect(calculateLevel(1000)).toBe(2);
        expect(calculateLevel(2500)).toBe(3);
    });

    it('clamps negative XP to level 1 (never returns 0 or below)', () => {
        expect(calculateLevel(-500)).toBe(1);
        expect(calculateLevel(-1)).toBe(1);
    });

    it('treats non-finite XP as zero', () => {
        expect(calculateLevel(NaN)).toBe(1);
        expect(calculateLevel(-Infinity)).toBe(1);
    });
});