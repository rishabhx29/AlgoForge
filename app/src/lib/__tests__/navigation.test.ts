import { describe, expect, it } from 'vitest';
import { isNavigationLinkActive } from '@/lib/navigation';

describe('isNavigationLinkActive', () => {
  it('uses the scroll section on home and the view elsewhere', () => {
    const home = { id: 'home', view: 'home', isAnchor: true };
    const roadmaps = { id: 'roadmaps', view: 'home', isAnchor: true };
    const problems = { id: 'problems', view: 'problems', isAnchor: false };

    expect(isNavigationLinkActive(home, 'home', 'home')).toBe(true);
    expect(isNavigationLinkActive(roadmaps, 'home', 'home')).toBe(false);
    expect(isNavigationLinkActive(roadmaps, 'home', 'roadmaps')).toBe(true);
    expect(isNavigationLinkActive(home, 'home', 'roadmaps')).toBe(false);
    expect(isNavigationLinkActive(problems, 'home', 'problems')).toBe(false);
    expect(isNavigationLinkActive(problems, 'problems', 'home')).toBe(true);
    expect(isNavigationLinkActive(home, 'problems', 'home')).toBe(false);
    expect(isNavigationLinkActive(problems, 'leaderboard', 'problems')).toBe(false);
  });
});
