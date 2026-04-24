import { describe, expect, it } from 'vitest';
import { waitFor } from '@testing-library/react';
import { renderHookWithProviders } from '@/test/hook-utils';
import { useCompleteProfile } from './use-complete-profile';
import { useAuthStore } from '@/auth/auth-store';
import { setMswSignedInPhone } from '@/test/msw-fixtures/auth-handlers';

function setAuth() {
  useAuthStore.getState().setSession({
    token: 'msw-jwt.token',
    user: {
      id: '00000000-0000-4000-8000-000000000004',
      phone: '+911234567892',
      role: 'lp',
      name: null,
      email: null,
      organisation: null,
      profile_complete: false,
    },
    expiresAt: Date.now() + 60 * 60_000,
  });
  setMswSignedInPhone('+911234567892');
}

describe('useCompleteProfile', () => {
  it('marks profile_complete=true on success', async () => {
    setAuth();
    const { result } = renderHookWithProviders(() => useCompleteProfile());

    result.current.mutate({ name: 'Kapil Sahu' });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.profile_complete).toBe(true);
    expect(result.current.data?.name).toBe('Kapil Sahu');
  });

  it('surfaces 409 conflict for taken email', async () => {
    setAuth();
    const { result } = renderHookWithProviders(() => useCompleteProfile());

    result.current.mutate({ name: 'Kapil Sahu', email: 'taken@example.com' });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error?.code).toBe('conflict');
  });

  it('fails validation when name is empty', async () => {
    setAuth();
    const { result } = renderHookWithProviders(() => useCompleteProfile());

    result.current.mutate({ name: '' });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error?.code).toBe('validation_error');
  });
});
