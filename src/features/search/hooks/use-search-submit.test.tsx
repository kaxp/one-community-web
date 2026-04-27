import { describe, expect, it } from 'vitest';
import { act, waitFor } from '@testing-library/react';
import { renderHookWithProviders } from '@/test/hook-utils';
import { useSearchSubmit } from './use-search-submit';
import { useAuthStore } from '@/auth/auth-store';

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

describe('useSearchSubmit', () => {
  it('rejects empty query without hitting the network', async () => {
    signInAsLP();
    const { result } = renderHookWithProviders(() =>
      useSearchSubmit({ query: '   ', filters: {} }),
    );
    await act(async () => {
      result.current.mutate();
    });
    await waitFor(() => expect(result.current.isError).toBe(true));
  });

  it('returns a SearchResponse on a non-empty query', async () => {
    signInAsLP();
    const { result } = renderHookWithProviders(() =>
      useSearchSubmit({ query: 'fintech', filters: {} }),
    );
    await act(async () => {
      result.current.mutate();
    });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.results).toBeDefined();
  });
});
