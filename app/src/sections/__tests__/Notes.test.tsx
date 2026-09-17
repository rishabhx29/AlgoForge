import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Notes } from '@/sections/Notes';
import { getUserProgress, updateNotes } from '@/api/userActions';
import { getAllProblems } from '@/api/content';

vi.mock('@/api/userActions', () => ({ getUserProgress: vi.fn(), updateNotes: vi.fn() }));
vi.mock('@/api/content', () => ({ getAllProblems: vi.fn() }));
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

beforeEach(() => {
  vi.resetAllMocks();
  vi.mocked(getUserProgress).mockResolvedValue([]);
  vi.mocked(getAllProblems).mockResolvedValue([{ id: 'p1', title: 'Two Sum', difficulty: 'Easy' }]);
  vi.mocked(updateNotes).mockResolvedValue({ id: 'n1' });
});

describe('Notes accessible editor', () => {
  it('associates editor labels and saves a new note through named controls', async () => {
    const user = userEvent.setup();
    render(<Notes />);
    await user.click(await screen.findByRole('button', { name: 'New Note' }));
    expect(screen.getByRole('textbox', { name: 'Search notes' })).toBeInTheDocument();
    const search = screen.getByLabelText('Select Problem');
    await user.type(search, 'Two');
    await user.click(screen.getByRole('button', { name: /Two Sum/ }));
    const content = screen.getByLabelText('Notes', { selector: 'textarea' });
    await user.type(content, 'Use a hash map');
    await user.click(screen.getByRole('button', { name: 'Save note' }));
    expect(updateNotes).toHaveBeenCalledExactlyOnceWith('p1', 'Use a hash map');
    expect(await screen.findByText('Select a note to view')).toBeInTheDocument();
  });
});
