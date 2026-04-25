import { describe, expect, it } from 'vitest';
import { waitFor, renderHook } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { usePartnerReferral } from './use-partner-referral';
import { useAuthStore } from '@/auth/auth-store';
import {
  queuePartnerReferralError,
  setMswPartnerReferralCount,
} from '@/test/msw-fixtures/admin-partner-referral-handlers';

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

describe('usePartnerReferral', () => {
  it('broadcasts a referral and returns the partners_notified count', async () => {
    signedInAsAdmin();
    setMswPartnerReferralCount(7);
    const client = new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    });
    const { result } = renderHook(() => usePartnerReferral(), { wrapper: makeWrapper(client) });
    result.current.mutate({ sector: 'fintech' });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.partners_notified).toBe(7);
    expect(result.current.data?.sector).toBe('fintech');
  });

  it('surfaces a 422 validation_error', async () => {
    signedInAsAdmin();
    queuePartnerReferralError({ status: 422, code: 'validation_error', message: 'bad' });
    const client = new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    });
    const { result } = renderHook(() => usePartnerReferral(), { wrapper: makeWrapper(client) });
    result.current.mutate({ sector: 'fintech' });
    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error?.code).toBe('validation_error');
  });
});
