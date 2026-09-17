import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Roadmaps } from '@/sections/Roadmaps';

vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ user: null }) }));
vi.mock('@tanstack/react-query', () => ({ useQuery: () => ({ data: [] }) }));
vi.mock('@/hooks/useStats', () => ({
  useStats: () => ({ problemCount: 10, videoCount: 10, roadmapCount: 2, userCount: 5 }),
}));
vi.mock('@/hooks/useContent', () => ({
  useHomeContent: () => ({
    isLoading: false,
    data: {
      paths: [
        { id: 'dsa', title: 'Data Structures', description: 'Learn DSA', color: '#a088ff', totalProblems: 5 },
        { id: 'algorithms', title: 'Algorithms', description: 'Learn algorithms', color: '#63e3ff', totalProblems: 5 },
      ],
      topics: [],
      problems: [],
    },
  }),
}));

beforeEach(() => {
  vi.stubGlobal('IntersectionObserver', class {
    observe() {}
    unobserve() {}
    disconnect() {}
  });
});
afterEach(() => vi.unstubAllGlobals());

describe('Roadmaps card controls', () => {
  it('provides one native button per card, without nested controls', () => {
    const { container } = render(<Roadmaps onPathClick={vi.fn()} />);
    expect(screen.getAllByRole('button')).toHaveLength(2);
    expect(container.querySelector('button button, button a, button [role="button"]')).toBeNull();
    expect(screen.getByRole('heading', { name: 'Data Structures' })).toBeInTheDocument();
  });

  it('opens the selected path once on click', async () => {
    const onPathClick = vi.fn();
    render(<Roadmaps onPathClick={onPathClick} />);
    await userEvent.click(screen.getByRole('button', { name: 'Start learning Algorithms' }));
    expect(onPathClick).toHaveBeenCalledExactlyOnceWith('algorithms');
  });

  it.each(['{Enter}', ' '])('opens cards using %s and follows tab order', async (key) => {
    const user = userEvent.setup();
    const onPathClick = vi.fn();
    render(<Roadmaps onPathClick={onPathClick} />);
    await user.tab();
    expect(screen.getByRole('button', { name: 'Start learning Data Structures' })).toHaveFocus();
    await user.keyboard(key);
    expect(onPathClick).toHaveBeenCalledExactlyOnceWith('dsa');
    onPathClick.mockClear();
    await user.tab();
    expect(screen.getByRole('button', { name: 'Start learning Algorithms' })).toHaveFocus();
    await user.keyboard(key);
    expect(onPathClick).toHaveBeenCalledExactlyOnceWith('algorithms');
  });
});
