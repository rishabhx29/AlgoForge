import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { DailyChallenges } from '@/sections/DailyChallenges';
import { getUserProgress } from '@/api/userActions';
import { toast } from 'sonner';

vi.mock('@/api/content', () => ({ getAllProblems: vi.fn().mockResolvedValue([]) }));
vi.mock('@/api/userActions', () => ({ getUserProgress: vi.fn(), updateProblemStatus: vi.fn() }));
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ refreshProfile: vi.fn() }) }));
vi.mock('sonner', () => ({ toast: { error: vi.fn(), success: vi.fn() } }));

beforeEach(() => {
  vi.clearAllMocks();
  vi.spyOn(console, 'error').mockImplementation(() => {});
});
afterEach(() => vi.restoreAllMocks());

describe('DailyChallenges progress failures', () => {
  it.each([401, 500, undefined])('keeps challenges visible after status %s', async (status) => {
    const error = status === undefined ? new Error('Network unavailable') : {
      isAxiosError: true, response: { status },
    };
    vi.mocked(getUserProgress).mockRejectedValue(error);
    render(<DailyChallenges onBack={vi.fn()} />);
    expect(await screen.findByRole('button', { name: 'Back to Dashboard' })).toBeInTheDocument();
    if (status === 401) {
      expect(toast.error).not.toHaveBeenCalled();
      expect(console.error).not.toHaveBeenCalled();
    } else {
      expect(toast.error).toHaveBeenCalledWith('Failed to load your challenge progress');
      expect(console.error).toHaveBeenCalledWith('Failed to load challenge progress', error);
    }
  });
});
