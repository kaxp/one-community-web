import { describe, expect, it } from 'vitest';
import { waitFor, renderHook } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { useLpFunnelStatus } from './use-lp-funnel-status';
import { useAuthStore } from '@/auth/auth-store';
import { setMswLpFunnelStatus } from '@/test/msw-fixtures/admin-lp-funnel-handlers';

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

const LP_ID = '00000000-0000-4000-8000-000000000004';

describe('useLpFunnelStatus', () => {
  it('moves an LP from new_lead to first_reach_out (no skip)', async () => {
    signedInAsAdmin();
    const client = new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    });
    const { result } = renderHook(() => useLpFunnelStatus(), { wrapper: makeWrapper(client) });
    result.current.mutate({ user_id: LP_ID, status: '2_first_reach_out' });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.funnel_status).toBe('2_first_reach_out');
    expect(result.current.data?.auto_actions_triggered).toContain('welcome_email_sent');
  });

  it('returns 409 conflict on a forward skip without override', async () => {
    signedInAsAdmin();
    setMswLpFunnelStatus(LP_ID, '1_new_lead');
    const client = new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    });
    const { result } = renderHook(() => useLpFunnelStatus(), { wrapper: makeWrapper(client) });
    result.current.mutate({ user_id: LP_ID, status: '3_in_conversation' });
    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error?.code).toBe('conflict');
    const detail = result.current.error?.detail as
      | { current_status?: string; attempted?: string }
      | null
      | undefined;
    expect(detail?.current_status).toBe('1_new_lead');
    expect(detail?.attempted).toBe('3_in_conversation');
  });

  it('succeeds on a forward skip when override=true', async () => {
    signedInAsAdmin();
    setMswLpFunnelStatus(LP_ID, '1_new_lead');
    const client = new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    });
    const { result } = renderHook(() => useLpFunnelStatus(), { wrapper: makeWrapper(client) });
    result.current.mutate({ user_id: LP_ID, status: '3_in_conversation', override: true });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.funnel_status).toBe('3_in_conversation');
    expect(result.current.data?.auto_actions_triggered).toContain('deal_suggestions_enabled');
  });
});
