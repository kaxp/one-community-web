import { describe, expect, it } from 'vitest';
import { waitFor } from '@testing-library/react';
import { renderHookWithProviders } from '@/test/hook-utils';
import { useSearch } from './use-search';
import { useAuthStore } from '@/auth/auth-store';
import { setMswSearchScenario } from '@/test/msw-fixtures/search-handlers';

function signInAsLP() {
  useAuthStore.getState().setSession({
    token: 'msw-jwt.test',
    user: {
      id: '00000000-0000-4000-8000-000000000004',
      phone: '+911234567892',
      role: 'lp',
      name: 'LP',
      email: null,
      organisation: null,
      profile_complete: true,
    },
    expiresAt: Date.now() + 60 * 60_000,
  });
}

describe('useSearch', () => {
  it('is idle when query is empty', () => {
    signInAsLP();
    const { result } = renderHookWithProviders(() =>
      useSearch({ query: '', filters: {}, enabled: true }),
    );
    expect(result.current.fetchStatus).toBe('idle');
  });

  it('is idle when not enabled', () => {
    signInAsLP();
    const { result } = renderHookWithProviders(() =>
      useSearch({ query: 'fintech', filters: {}, enabled: false }),
    );
    expect(result.current.fetchStatus).toBe('idle');
  });

  it('returns startup-shaped results when target_type is "startup"', async () => {
    signInAsLP();
    setMswSearchScenario('startup');
    const { result } = renderHookWithProviders(() =>
      useSearch({ query: 'fintech seed', filters: {}, enabled: true }),
    );
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    const first = result.current.data?.pages[0];
    expect(first?.target_type).toBe('startup');
    expect(first?.results).toHaveLength(2);
    expect(first?.stage3_applied).toBe(true);
  });

  it('returns lp-shaped results when target_type is "lp"', async () => {
    signInAsLP();
    setMswSearchScenario('lp');
    const { result } = renderHookWithProviders(() =>
      useSearch({ query: 'angel investor', filters: {}, enabled: true }),
    );
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    const first = result.current.data?.pages[0];
    expect(first?.target_type).toBe('lp');
    expect(first?.results[0]?.name).toBe('Abhinav Benthia');
  });

  it('handles stage3_applied=false fallback gracefully', async () => {
    signInAsLP();
    setMswSearchScenario('stage3_fallback');
    const { result } = renderHookWithProviders(() =>
      useSearch({ query: 'saas', filters: {}, enabled: true }),
    );
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    const first = result.current.data?.pages[0];
    expect(first?.stage3_applied).toBe(false);
    expect(first?.results[0]?.ai_rank).toBeNull();
  });

  it('handles empty results', async () => {
    signInAsLP();
    setMswSearchScenario('empty');
    const { result } = renderHookWithProviders(() =>
      useSearch({ query: 'nothing matches', filters: {}, enabled: true }),
    );
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.pages[0]?.results).toEqual([]);
  });

  it('surfaces 429 rate_limit as ApiError', async () => {
    signInAsLP();
    setMswSearchScenario('rate_limit');
    const { result } = renderHookWithProviders(() =>
      useSearch({ query: 'fintech', filters: {}, enabled: true }),
    );
    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error?.code).toBe('rate_limit_exceeded');
  });
});
