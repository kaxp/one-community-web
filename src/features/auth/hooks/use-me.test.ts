import { describe, expect, it } from 'vitest';
import { waitFor } from '@testing-library/react';
import { renderHookWithProviders } from '@/test/hook-utils';
import { useMe } from './use-me';
import { useAuthStore } from '@/auth/auth-store';
import { setMswSignedInPhone } from '@/test/msw-fixtures/auth-handlers';

function setAuth(phone: string, userId: string, role: 'lp' | 'admin') {
  useAuthStore.getState().setSession({
    token: 'msw-jwt.token',
    user: {
      id: userId,
      phone,
      role,
      name: null,
      email: null,
      organisation: null,
      profile_complete: false,
    },
    expiresAt: Date.now() + 60 * 60_000,
  });
}

describe('useMe', () => {
  it('fetches profile when a session is hydrated', async () => {
    setAuth('+911234567892', '00000000-0000-4000-8000-000000000004', 'lp');
    setMswSignedInPhone('+911234567892');

    const { result } = renderHookWithProviders(() => useMe());

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.role).toBe('lp');
    expect(result.current.data?.phone).toBe('+911234567892');
  });

  it('is disabled when no session is present', () => {
    const { result } = renderHookWithProviders(() => useMe());
    expect(result.current.fetchStatus).toBe('idle');
  });
});
