import { describe, expect, it } from 'vitest';
import { waitFor } from '@testing-library/react';
import { renderHookWithProviders } from '@/test/hook-utils';
import { useLogInteraction } from './use-log-interaction';
import { useAuthStore } from '@/auth/auth-store';
import { getMswInteractionLogCount } from '@/test/msw-fixtures/search-handlers';

function signedIn() {
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

describe('useLogInteraction', () => {
  it('fires the request fire-and-forget for a fresh (target_id, type) pair', async () => {
    signedIn();
    const startCount = getMswInteractionLogCount();
    const { result } = renderHookWithProviders(() => useLogInteraction());

    result.current({
      target_id: '11111111-1111-4000-8000-000000000001',
      interaction_type: 'search_view',
      target_type: 'startup',
    });

    await waitFor(() => expect(getMswInteractionLogCount()).toBe(startCount + 1));
  });

  it('dedupes back-to-back fires for the same (target_id, type) within 10s', async () => {
    signedIn();
    const startCount = getMswInteractionLogCount();
    const { result } = renderHookWithProviders(() => useLogInteraction());

    const body = {
      target_id: '11111111-1111-4000-8000-000000000002' as const,
      interaction_type: 'search_view' as const,
      target_type: 'startup' as const,
    };
    result.current(body);
    result.current(body);
    result.current(body);

    await waitFor(() => expect(getMswInteractionLogCount()).toBe(startCount + 1));
  });

  it('does not throw on a network failure (silent log)', async () => {
    signedIn();
    const { result } = renderHookWithProviders(() => useLogInteraction());

    expect(() =>
      result.current({
        target_id: 'bad-uuid' as unknown as string,
        interaction_type: 'search_view',
        target_type: 'startup',
      }),
    ).not.toThrow();
  });
});
