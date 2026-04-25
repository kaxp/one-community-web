import { describe, expect, it } from 'vitest';
import { waitFor } from '@testing-library/react';
import { renderHookWithProviders } from '@/test/hook-utils';
import { useAdminSummary } from './use-admin-summary';
import { useAuthStore } from '@/auth/auth-store';
import { queueAdminSummaryError } from '@/test/msw-fixtures/admin-home-handlers';

function signedInAsAdmin() {
  useAuthStore.getState().setSession({
    token: 'msw-jwt.test',
    user: {
      id: '00000000-0000-4000-8000-000000000002',
      phone: '+911234567890',
      role: 'admin',
      name: 'Admin Dev',
      email: null,
      organisation: null,
      profile_complete: true,
    },
    expiresAt: Date.now() + 60 * 60_000,
  });
}

describe('useAdminSummary', () => {
  it('returns the seed KPI payload', async () => {
    signedInAsAdmin();
    const { result } = renderHookWithProviders(() => useAdminSummary());
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.pending_connection_count).toBeGreaterThanOrEqual(0);
    expect(result.current.data?.mis_status.length).toBeGreaterThan(0);
  });

  it('surfaces 500 internal_error', async () => {
    signedInAsAdmin();
    queueAdminSummaryError({ status: 500, code: 'internal_error', message: 'boom' });
    const { result } = renderHookWithProviders(() => useAdminSummary());
    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error?.code).toBe('internal_error');
  });
});
