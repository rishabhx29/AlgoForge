import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// Never-resolving mock: proves the hook does NOT wait on the network when a
// cached payload exists, and DOES call the API when hydrating from scratch.
vi.mock('@/api/apiClient', () => ({
  apiClient: {
    get: vi.fn(() => new Promise(() => {})),
  },
}));

import { apiClient } from '@/api/apiClient';
import {
  readCachedStats,
  writeCachedStats,
  usePublicStats,
} from '@/hooks/useContent';

const SAMPLE = { userCount: 32, problemCount: 120, roadmapCount: 6, videoCount: 45 };

const STORAGE_KEY = 'algoforge:public-stats';

function seedStorage(t: number = Date.now()) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ v: SAMPLE, t }));
}

function makeWrapper() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
}

/** Minimal consumer: renders the user count, or 'empty' while there is no data. */
function StatsHarness() {
  const { data } = usePublicStats();
  return <div>{data ? `${data.userCount}` : 'empty'}</div>;
}

describe('usePublicStats localStorage hydration', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  it('round-trips a stats payload through writeCachedStats/readCachedStats', () => {
    writeCachedStats(SAMPLE);
    const cached = readCachedStats();
    expect(cached).toBeDefined();
    expect(cached!.data).toEqual(SAMPLE);
    expect(cached!.updatedAt).toBeGreaterThan(Date.now() - 5000);
  });

  it('returns undefined when nothing is stored', () => {
    expect(readCachedStats()).toBeUndefined();
  });

  it('returns undefined for corrupted JSON (fail-safe, no throw)', () => {
    localStorage.setItem(STORAGE_KEY, '{not valid json');
    expect(readCachedStats()).toBeUndefined();
  });

  it('returns undefined when payload fields are missing or wrong-typed', () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ v: { userCount: 'x' }, t: Date.now() }));
    expect(readCachedStats()).toBeUndefined();
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ t: Date.now() }));
    expect(readCachedStats()).toBeUndefined();
  });

  it('renders the counters synchronously from cache without a network call', () => {
    seedStorage(); // timestamp = now → within staleTime, no refetch
    render(<StatsHarness />, { wrapper: makeWrapper() });

    // The number is painted on the very first render, before any promise
    // could possibly resolve.
    expect(screen.getByText('32')).toBeInTheDocument();
    expect(apiClient.get).not.toHaveBeenCalled();
  });

  it('renders "empty" and starts the fetch when there is no cached payload', () => {
    render(<StatsHarness />, { wrapper: makeWrapper() });

    expect(screen.getByText('empty')).toBeInTheDocument();
    expect(apiClient.get).toHaveBeenCalledWith('/api/info/stats');
  });
});
