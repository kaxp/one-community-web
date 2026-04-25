import { describe, expect, it } from 'vitest';
import { waitFor } from '@testing-library/react';
import { renderHookWithProviders } from '@/test/hook-utils';
import { useAdminConnections } from './use-admin-connections';
import { useAuthStore } from '@/auth/auth-store';
import { queueAdminListError } from '@/test/msw-fixtures/admin-handlers';

function signInAsAdmin() {
  useAuthStore.getState().setSession({
    token: 'msw-jwt.test',
    user: {
      id: '22222222-2222-4000-8000-000000000003',
      phone: '+918087464723',
      role: 'admin',
      name: 'Kapil',
      email: 'kapil@warmupventures.com',
      organisation: null,
      profile_complete: true,
    },
    expiresAt: Date.now() + 60 * 60_000,
  });
}

describe('useAdminConnections', () => {
  it('fetches pending_admin rows and exposes them as the first page', async () => {
    signInAsAdmin();
    const { result } = renderHookWithProviders(() =>
      useAdminConnections({ status: 'pending_admin' }),
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    const first = result.current.data?.pages[0];
    expect(first?.items.length).toBeGreaterThanOrEqual(1);
    for (const row of first?.items ?? []) {
      expect(row.status).toBe('pending_admin');
    }
  });

  it('fetches accepted rows when the status changes', async () => {
    signInAsAdmin();
    const { result } = renderHookWithProviders(() => useAdminConnections({ status: 'accepted' }));

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    const first = result.current.data?.pages[0];
    for (const row of first?.items ?? []) {
      expect(row.status).toBe('accepted');
    }
  });

  it('surfaces 500 internal_error as ApiError', async () => {
    signInAsAdmin();
    queueAdminListError({ status: 500, code: 'internal_error', message: 'oops' });
    const { result } = renderHookWithProviders(() =>
      useAdminConnections({ status: 'pending_admin' }),
    );
    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error?.code).toBe('internal_error');
  });
});
