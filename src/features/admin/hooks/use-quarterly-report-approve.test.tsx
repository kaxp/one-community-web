import { describe, expect, it } from 'vitest';
import { act, waitFor } from '@testing-library/react';
import { renderHookWithProviders } from '@/test/hook-utils';
import { useQuarterlyReportApprove } from './use-quarterly-report-approve';
import { useAuthStore } from '@/auth/auth-store';
import {
  getMswQuarterlyApproveCount,
  queueQuarterlyReportApproveError,
} from '@/test/msw-fixtures/admin-quarterly-reports-handlers';

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

describe('useQuarterlyReportApprove', () => {
  it('approves a pending report and bumps the server-side counter', async () => {
    signedInAsAdmin();
    const start = getMswQuarterlyApproveCount();
    const { result } = renderHookWithProviders(() => useQuarterlyReportApprove());
    await act(async () => {
      result.current.mutate({ report_id: 'r1-q1-2026' });
    });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(getMswQuarterlyApproveCount()).toBe(start + 1);
    expect(result.current.data?.status).toBe('approved');
  });

  it('surfaces 409 conflict when already approved', async () => {
    signedInAsAdmin();
    queueQuarterlyReportApproveError({
      status: 409,
      code: 'conflict',
      message: 'Already approved',
    });
    const { result } = renderHookWithProviders(() => useQuarterlyReportApprove());
    await act(async () => {
      result.current.mutate({ report_id: 'r2-q4-2025' });
    });
    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error?.code).toBe('conflict');
  });
});
