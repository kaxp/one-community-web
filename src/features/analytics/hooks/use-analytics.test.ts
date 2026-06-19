import { describe, expect, it } from 'vitest';
import { waitFor } from '@testing-library/react';
import { renderHookWithProviders } from '@/test/hook-utils';
import { useAnalyticsOverview } from './use-analytics-overview';
import { useAnalyticsCohort } from './use-analytics-cohort';
import { useAnalyticsMatchSuccess } from './use-analytics-match-success';
import { useAnalyticsFunnelLp } from './use-analytics-funnel-lp';
import { useAnalyticsFunnelStartup } from './use-analytics-funnel-startup';
import { useAnalyticsFunnelConnections } from './use-analytics-funnel-connections';
import { useAuthStore } from '@/auth/auth-store';
import { queueAnalyticsOverviewError } from '@/test/msw-fixtures/admin-analytics-handlers';

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

describe('analytics hooks', () => {
  it('useAnalyticsOverview returns the seeded KPIs (and tolerates unknown keys)', async () => {
    signedInAsAdmin();
    const { result } = renderHookWithProviders(() => useAnalyticsOverview());
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.total_users).toBe(412);
    // Unknown key from the fixture is preserved (.passthrough()).
    expect(
      (result.current.data as Record<string, unknown> | undefined)?.speculative_signal_count,
    ).toBe(3);
  });

  it('useAnalyticsCohort returns 3 seeded rows', async () => {
    signedInAsAdmin();
    const { result } = renderHookWithProviders(() => useAnalyticsCohort({ months: 12 }));
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.items.length).toBe(3);
    expect(result.current.data?.items[0]?.cohort).toBe('2026-01');
  });

  it('useAnalyticsMatchSuccess returns weekly rows with percentages', async () => {
    signedInAsAdmin();
    const { result } = renderHookWithProviders(() => useAnalyticsMatchSuccess());
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.items.length).toBe(3);
    expect(result.current.data?.items[0]?.accepted_pct).toBeCloseTo(0.38);
  });

  it('overview surfaces 500 errors as ApiError', async () => {
    signedInAsAdmin();
    queueAnalyticsOverviewError({ status: 500, code: 'internal_error', message: 'boom' });
    const { result } = renderHookWithProviders(() => useAnalyticsOverview());
    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error?.code).toBe('internal_error');
  });

  it('useAnalyticsFunnelLp returns the seeded items (issues.md [I-11])', async () => {
    signedInAsAdmin();
    const { result } = renderHookWithProviders(() => useAnalyticsFunnelLp());
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(Array.isArray(result.current.data?.items)).toBe(true);
  });

  it('useAnalyticsFunnelStartup returns the seeded items (issues.md [I-11])', async () => {
    signedInAsAdmin();
    const { result } = renderHookWithProviders(() => useAnalyticsFunnelStartup());
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(Array.isArray(result.current.data?.items)).toBe(true);
  });

  it('useAnalyticsFunnelConnections returns the seeded items (issues.md [I-11])', async () => {
    signedInAsAdmin();
    const { result } = renderHookWithProviders(() => useAnalyticsFunnelConnections());
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(Array.isArray(result.current.data?.items)).toBe(true);
  });
});
