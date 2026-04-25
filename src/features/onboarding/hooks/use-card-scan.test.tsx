import { describe, expect, it, vi } from 'vitest';
import { waitFor, renderHook } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { useCardScan } from './use-card-scan';
import { useGetCardScan } from './use-get-card-scan';
import { useAuthStore } from '@/auth/auth-store';
import {
  queueCardScanConfirmError,
  setMswCardScanCreatesUser,
} from '@/test/msw-fixtures/onboarding-handlers';
import { renderHookWithProviders } from '@/test/hook-utils';

function signedInAsLP() {
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

const RAW_TEXT = 'Kapil Sahu\nPrincipal, Warmup Ventures\n+91-9876543210\nkapil@example.com';

describe('useCardScan', () => {
  it('parses raw_text and returns the GPT-4o parsed payload', async () => {
    signedInAsLP();
    const client = new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    });

    const { result } = renderHook(() => useCardScan(), { wrapper: makeWrapper(client) });
    result.current.mutate({ raw_text: RAW_TEXT });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data?.parsed.name).toBe('Kapil Sahu');
    expect(result.current.data?.user_created).toBe(false);
  });

  it('confirm phase with parsed + category creates a user (default fixture)', async () => {
    signedInAsLP();
    const client = new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    });

    const { result } = renderHook(() => useCardScan(), { wrapper: makeWrapper(client) });
    result.current.mutate({
      raw_text: RAW_TEXT,
      parsed: { name: 'Kapil', phone: '+919876543210' },
      category: 'lp',
    });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.user_created).toBe(true);
    expect(result.current.data?.user_id).toBeTruthy();
  });

  it('confirm phase reports user_created=false when fixture toggle is off', async () => {
    signedInAsLP();
    setMswCardScanCreatesUser(false);
    const client = new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    });

    const { result } = renderHook(() => useCardScan(), { wrapper: makeWrapper(client) });
    result.current.mutate({
      raw_text: RAW_TEXT,
      parsed: { name: 'Kapil', phone: '+919876543210' },
      category: 'lp',
    });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.user_created).toBe(false);
    expect(result.current.data?.user_id).toBeNull();
  });

  it('surfaces 409 duplicate_contact with existing_user_id detail', async () => {
    signedInAsLP();
    queueCardScanConfirmError({
      status: 409,
      code: 'duplicate_contact',
      message: 'A contact with this phone or email already exists',
      detail: { existing_user_id: '0f3c0b0a-e6cc-4f1c-9a2e-a5b2e3f1c9d0' },
    });
    const client = new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    });

    const { result } = renderHook(() => useCardScan(), { wrapper: makeWrapper(client) });
    result.current.mutate({
      raw_text: RAW_TEXT,
      parsed: { name: 'Kapil', phone: '+919876543210' },
      category: 'lp',
    });
    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error?.code).toBe('duplicate_contact');
    expect(result.current.error?.detail).toEqual({
      existing_user_id: '0f3c0b0a-e6cc-4f1c-9a2e-a5b2e3f1c9d0',
    });
  });
});

describe('useGetCardScan', () => {
  it('does not fire when scanId is undefined', () => {
    signedInAsLP();
    const { result } = renderHookWithProviders(() => useGetCardScan(undefined));
    expect(result.current.isFetching).toBe(false);
    expect(result.current.fetchStatus).toBe('idle');
  });

  it('fetches a previously created scan record', async () => {
    signedInAsLP();
    // First, create a scan via the POST handler so the GET handler has a row.
    const post = vi.fn();
    void post;
    const client = new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    });
    const { result: createResult } = renderHook(() => useCardScan(), {
      wrapper: makeWrapper(client),
    });
    createResult.current.mutate({ raw_text: RAW_TEXT });
    await waitFor(() => expect(createResult.current.isSuccess).toBe(true));
    const scanId = createResult.current.data?.scan_id;
    expect(scanId).toBeTruthy();

    // Now read it back via the GET hook on a fresh client (so no warm cache).
    const { result } = renderHookWithProviders(() => useGetCardScan(scanId));
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.scan_id).toBe(scanId);
    expect(result.current.data?.status).toBe('processed');
  });
});
