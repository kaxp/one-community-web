import { describe, expect, it } from 'vitest';
import { waitFor } from '@testing-library/react';
import { renderHookWithProviders } from '@/test/hook-utils';
import { useQuarterlyReports } from './use-quarterly-reports';
import { useAuthStore } from '@/auth/auth-store';
import { queueQuarterlyReportsListError } from '@/test/msw-fixtures/admin-quarterly-reports-handlers';

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

describe('useQuarterlyReports', () => {
  it('returns the seeded list', async () => {
    signedInAsAdmin();
    const { result } = renderHookWithProviders(() => useQuarterlyReports({ quarter: null }));
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect((result.current.data ?? []).length).toBeGreaterThan(0);
  });

  it('filters by quarter when provided', async () => {
    signedInAsAdmin();
    const { result } = renderHookWithProviders(() => useQuarterlyReports({ quarter: 'Q4-2025' }));
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.every((r) => r.quarter === 'Q4-2025')).toBe(true);
  });

  it('surfaces 500 internal_error', async () => {
    signedInAsAdmin();
    queueQuarterlyReportsListError({ status: 500, code: 'internal_error', message: 'boom' });
    const { result } = renderHookWithProviders(() => useQuarterlyReports({ quarter: null }));
    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error?.code).toBe('internal_error');
  });
});
