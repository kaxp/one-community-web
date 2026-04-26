import { describe, expect, it, vi } from 'vitest';
import { waitFor, renderHook, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { useMyDigests } from './use-my-digests';
import { useMyDigestPreferences } from './use-my-digest-preferences';
import { useUpdateMyDigestPreferences } from './use-update-my-digest-preferences';
import { qk } from '@/api/query-keys';
import { useAuthStore } from '@/auth/auth-store';
import { renderHookWithProviders } from '@/test/hook-utils';
import {
  getMswDigestMePreferences,
  getMswDigestMeUpdateCount,
  queueDigestMeListError,
  queueDigestMeUpdateError,
  setMswDigestMeRows,
} from '@/test/msw-fixtures/digest-me-handlers';
import type { MyDigestPreferences } from '@/features/digest/me-schemas';

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

function makeWrapper(client: QueryClient) {
  return function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
  };
}

describe('useMyDigests', () => {
  it('returns the 3-row seed on the first page', async () => {
    signedIn();
    const { result } = renderHookWithProviders(() => useMyDigests({ limit: 20 }));
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    const items = (result.current.data?.pages ?? []).flatMap((p) => p.items);
    expect(items).toHaveLength(3);
    expect(items[0]?.subject).toContain('Warmup Update');
  });

  it('next_cursor is null when the fixture fits on one page', async () => {
    signedIn();
    const { result } = renderHookWithProviders(() => useMyDigests({ limit: 20 }));
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.hasNextPage).toBe(false);
    expect(result.current.data?.pages[0]?.next_cursor).toBeNull();
  });

  it('paginates: 2 rows per page, 3 rows total → 2 pages', async () => {
    signedIn();
    const client = new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    });
    const { result } = renderHook(() => useMyDigests({ limit: 2 }), {
      wrapper: makeWrapper(client),
    });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.pages[0]?.items).toHaveLength(2);
    expect(result.current.hasNextPage).toBe(true);

    await act(async () => {
      await result.current.fetchNextPage();
    });
    await waitFor(() => expect(result.current.data?.pages?.length).toBe(2));
    expect(result.current.data?.pages[1]?.items).toHaveLength(1);
    expect(result.current.hasNextPage).toBe(false);
  });

  it('returns empty list when fixture cleared', async () => {
    signedIn();
    setMswDigestMeRows([]);
    const { result } = renderHookWithProviders(() => useMyDigests({ limit: 20 }));
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect((result.current.data?.pages ?? []).flatMap((p) => p.items)).toHaveLength(0);
  });

  it('surfaces 500 internal_error as ApiError', async () => {
    signedIn();
    queueDigestMeListError({ status: 500, code: 'internal_error', message: 'boom' });
    const { result } = renderHookWithProviders(() => useMyDigests({ limit: 20 }));
    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error?.code).toBe('internal_error');
  });
});

describe('useMyDigestPreferences', () => {
  it('hydrates frequency + tags + opted_in_wa from MSW', async () => {
    signedIn();
    const { result } = renderHookWithProviders(() => useMyDigestPreferences());
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.frequency).toBe('weekly');
    expect(result.current.data?.interest_tags).toContain('defence');
    expect(result.current.data?.opted_in_wa).toBe(true);
  });
});

describe('useUpdateMyDigestPreferences', () => {
  it('optimistically updates and persists on success', async () => {
    signedIn();
    const client = new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    });
    client.setQueryData<MyDigestPreferences>(qk.me.digest.preferences, {
      frequency: 'weekly',
      interest_tags: ['fintech'],
      opted_in_wa: true,
    });

    const { result } = renderHook(() => useUpdateMyDigestPreferences(), {
      wrapper: makeWrapper(client),
    });
    result.current.mutate({
      frequency: 'monthly',
      interest_tags: ['fintech', 'defence'],
      opted_in_wa: false,
    });

    // Optimistic update fires before the server responds.
    await waitFor(() => {
      const cached = client.getQueryData<MyDigestPreferences>(qk.me.digest.preferences);
      expect(cached?.frequency).toBe('monthly');
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.frequency).toBe('monthly');
    expect(getMswDigestMePreferences().frequency).toBe('monthly');
    expect(getMswDigestMeUpdateCount()).toBe(1);
  });

  it('also invalidates recentAll when paused is set', async () => {
    signedIn();
    const client = new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    });
    const invalidate = vi.spyOn(client, 'invalidateQueries');

    const { result } = renderHook(() => useUpdateMyDigestPreferences(), {
      wrapper: makeWrapper(client),
    });
    result.current.mutate({ frequency: 'paused', interest_tags: [], opted_in_wa: true });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    const calledKeys = invalidate.mock.calls.map(
      (c) => (c[0] as { queryKey?: readonly unknown[] } | undefined)?.queryKey,
    );
    expect(calledKeys).toContainEqual(qk.me.digest.preferences);
    expect(calledKeys).toContainEqual(qk.me.digest.recentAll);
  });

  it('rolls back optimistic update on 422 error', async () => {
    signedIn();
    queueDigestMeUpdateError({
      status: 422,
      code: 'validation_error',
      message: 'Validation failed',
      detail: [
        {
          loc: ['body', 'frequency'],
          msg: "Input should be 'weekly', 'monthly' or 'paused'",
          type: 'literal_error',
        },
      ],
    });
    const client = new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    });
    const initial: MyDigestPreferences = {
      frequency: 'weekly',
      interest_tags: [],
      opted_in_wa: true,
    };
    client.setQueryData<MyDigestPreferences>(qk.me.digest.preferences, initial);

    const { result } = renderHook(() => useUpdateMyDigestPreferences(), {
      wrapper: makeWrapper(client),
    });
    result.current.mutate({ frequency: 'monthly', interest_tags: [], opted_in_wa: true });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error?.code).toBe('validation_error');

    // After onSettled invalidates, the MSW still has 'weekly' → should restore.
    await waitFor(() => {
      const cached = client.getQueryData<MyDigestPreferences>(qk.me.digest.preferences);
      expect(cached?.frequency).toBe('weekly');
    });
  });
});
