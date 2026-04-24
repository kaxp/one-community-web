import { describe, expect, it } from 'vitest';
import { waitFor } from '@testing-library/react';
import { renderHookWithProviders } from '@/test/hook-utils';
import { useCreateLPProfile } from './use-create-lp-profile';
import { useAuthStore } from '@/auth/auth-store';
import { setMswSignedInPhone } from '@/test/msw-fixtures/auth-handlers';
import type { UserRole } from '@/types/enums';

function setAuth(role: UserRole, phone: string, userId: string) {
  useAuthStore.getState().setSession({
    token: 'msw-jwt.token',
    user: {
      id: userId,
      phone,
      role,
      name: null,
      email: null,
      organisation: null,
      profile_complete: true,
    },
    expiresAt: Date.now() + 60 * 60_000,
  });
  setMswSignedInPhone(phone);
}

describe('useCreateLPProfile', () => {
  it('returns profile_complete=true for an LP', async () => {
    setAuth('lp', '+911234567892', '00000000-0000-4000-8000-000000000004');
    const { result } = renderHookWithProviders(() => useCreateLPProfile());

    result.current.mutate({
      fund_name: 'Acme Capital',
      preferred_sectors: ['fintech'],
      preferred_stages: ['seed'],
      geography: ['IN'],
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.fund_name).toBe('Acme Capital');
  });

  it('returns 403 insufficient_role for a startup role', async () => {
    setAuth('startup_funded', '+911234567894', '00000000-0000-4000-8000-000000000006');
    const { result } = renderHookWithProviders(() => useCreateLPProfile());

    result.current.mutate({
      preferred_sectors: [],
      preferred_stages: [],
      geography: [],
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error?.code).toBe('insufficient_role');
  });
});
