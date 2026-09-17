import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AdminPanel } from '@/sections/AdminPanel';
import { getLearningPaths, getTopicsByPath, getProblemsByTopic } from '@/api/content';
import { toast } from 'sonner';

vi.mock('@/api/admin', () => ({ getAdminStats: vi.fn().mockResolvedValue({}) }));
vi.mock('@/api/content', () => ({
  getLearningPaths: vi.fn(), getTopicsByPath: vi.fn(), getProblemsByTopic: vi.fn(),
}));
vi.mock('sonner', () => ({ toast: { error: vi.fn() } }));

beforeEach(() => {
  vi.clearAllMocks();
  vi.spyOn(console, 'error').mockImplementation(() => {});
});
afterEach(() => vi.restoreAllMocks());

describe('Admin content controls', () => {
  it('exits loading and reports failed path requests', async () => {
    vi.mocked(getLearningPaths).mockRejectedValue(new Error('Offline'));
    render(<AdminPanel />);
    await userEvent.click(screen.getByRole('button', { name: 'Content' }));
    expect(await screen.findByText('Select a learning path and topic to manage problems')).toBeInTheDocument();
    expect(toast.error).toHaveBeenCalledWith('Failed to load learning paths');
    expect(screen.getByRole('combobox', { name: 'Learning Path' })).toBeInTheDocument();
  });

  it('associates the path, topic and difficulty labels with their selectors', async () => {
    vi.mocked(getLearningPaths).mockResolvedValue([{ id: 'dsa', title: 'DSA' }]);
    vi.mocked(getTopicsByPath).mockResolvedValue([{ id: 'arrays', title: 'Arrays' }]);
    vi.mocked(getProblemsByTopic).mockResolvedValue([]);
    render(<AdminPanel />);
    const user = userEvent.setup();
    await user.click(screen.getByRole('button', { name: 'Content' }));
    await screen.findByRole('option', { name: 'DSA' });
    await user.selectOptions(screen.getByLabelText('Learning Path'), 'dsa');
    await screen.findByRole('option', { name: 'Arrays' });
    await user.selectOptions(screen.getByLabelText('Topic'), 'arrays');
    await user.click(await screen.findByRole('button', { name: 'Add Problem' }));
    expect(await screen.findByRole('combobox', { name: 'Difficulty' })).toHaveValue('Easy');
  });
});
