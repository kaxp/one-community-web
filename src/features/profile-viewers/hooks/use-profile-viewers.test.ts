import { describe, expect, it } from 'vitest';
import { waitFor, act } from '@testing-library/react';
import { renderHookWithProviders } from '@/test/hook-utils';
import { useProfileViewers } from './use-profile-viewers';
import { useAuthStore } from '@/auth/auth-store';
import {
  queueProfileViewersError,
  setMswProfileViewersFixture,
  setMswProfileViewersGenerated,
  setMswProfileViewersLeakPii,
} from '@/test/msw-fixtures/profile-viewers-handlers';

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

describe('useProfileViewers', () => {
  it('returns the seeded list of 5 viewers on the first page', async () => {
    signedIn();
    const { result } = renderHookWithProviders(() => useProfileViewers({ limit: 50 }));
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    const items = (result.current.data?.pages ?? []).flatMap((p) => p.items);
    expect(items).toHaveLength(5);
    expect(items[0]?.viewer.role).toBe('lp');
  });

  it('returns empty + null cursor when fixture is empty', async () => {
    signedIn();
    setMswProfileViewersFixture([]);
    const { result } = renderHookWithProviders(() => useProfileViewers({ limit: 50 }));
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.pages?.[0]?.items).toEqual([]);
    expect(result.current.hasNextPage).toBe(false);
  });

  it('paginates a 60-row generated fixture across two pages of 50', async () => {
    signedIn();
    setMswProfileViewersGenerated(60);
    const { result } = renderHookWithProviders(() => useProfileViewers({ limit: 50 }));
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.pages?.[0]?.items).toHaveLength(50);
    expect(result.current.hasNextPage).toBe(true);

    await act(async () => {
      await result.current.fetchNextPage();
    });
    await waitFor(() => expect(result.current.data?.pages?.length).toBe(2));
    expect(result.current.data?.pages?.[1]?.items).toHaveLength(10);
    expect(result.current.hasNextPage).toBe(false);
  });

  it('strips backend-leaked email / phone before delivering items to the hook caller', async () => {
    signedIn();
    setMswProfileViewersLeakPii(true);
    const { result } = renderHookWithProviders(() => useProfileViewers({ limit: 50 }));
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    const firstViewer = result.current.data?.pages?.[0]?.items?.[0]?.viewer as Record<
      string,
      unknown
    >;
    expect(firstViewer).toBeDefined();
    expect(firstViewer.email).toBeUndefined();
    expect(firstViewer.phone).toBeUndefined();
  });

  it('surfaces 500 internal_error as ApiError', async () => {
    signedIn();
    queueProfileViewersError({ status: 500, code: 'internal_error', message: 'boom' });
    const { result } = renderHookWithProviders(() => useProfileViewers({ limit: 50 }));
    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error?.code).toBe('internal_error');
  });
});
