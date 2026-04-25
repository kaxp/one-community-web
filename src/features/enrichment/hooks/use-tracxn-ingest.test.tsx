import { describe, expect, it } from 'vitest';
import { waitFor, renderHook } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { useTracxnIngest } from './use-tracxn-ingest';
import { useAuthStore } from '@/auth/auth-store';
import { setMswTracxnForcedAction } from '@/test/msw-fixtures/admin-tracxn-handlers';

function signedInAsAdmin() {
  useAuthStore.getState().setSession({
    token: 'msw-jwt.test',
    user: {
      id: '00000000-0000-4000-8000-000000000002',
      phone: '+911234567890',
      role: 'admin',
      name: 'Admin',
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

describe('useTracxnIngest', () => {
  it('returns action=created on first submission of a new company', async () => {
    signedInAsAdmin();
    const client = new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    });
    const { result } = renderHook(() => useTracxnIngest(), { wrapper: makeWrapper(client) });
    result.current.mutate({ company_name: 'Acme Technologies' });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.action).toBe('created');
    expect(result.current.data?.startup_id).toBeTruthy();
  });

  it('returns action=merged with updated_fields when fixture forces it', async () => {
    signedInAsAdmin();
    setMswTracxnForcedAction('merged');
    const client = new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    });
    const { result } = renderHook(() => useTracxnIngest(), { wrapper: makeWrapper(client) });
    result.current.mutate({ company_name: 'NeoLedger' });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.action).toBe('merged');
    expect(result.current.data?.updated_fields?.length ?? 0).toBeGreaterThan(0);
  });

  it('returns action=duplicate_skipped when forced', async () => {
    signedInAsAdmin();
    setMswTracxnForcedAction('duplicate_skipped');
    const client = new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    });
    const { result } = renderHook(() => useTracxnIngest(), { wrapper: makeWrapper(client) });
    result.current.mutate({ company_name: 'Existing Co' });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.action).toBe('duplicate_skipped');
  });
});
