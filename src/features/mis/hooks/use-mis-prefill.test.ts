import { describe, expect, it } from 'vitest';
import { waitFor } from '@testing-library/react';
import { renderHookWithProviders } from '@/test/hook-utils';
import { useMisHistory } from './use-mis-prefill';
import { useAuthStore } from '@/auth/auth-store';

function signedInStartup() {
  useAuthStore.getState().setSession({
    token: 'msw-jwt.test',
    user: {
      id: '00000000-0000-4000-8000-000000000005',
      phone: '+911234567894',
      role: 'startup_funded',
      name: 'Founder',
      email: null,
      organisation: null,
      profile_complete: true,
    },
    expiresAt: Date.now() + 60 * 60_000,
  });
}

describe('useMisHistory (PRD §7.9.3)', () => {
  it('returns paginated history items', async () => {
    signedInStartup();
    const { result } = renderHookWithProviders(() => useMisHistory());
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    const items = result.current.data?.items ?? [];
    expect(items.length).toBeGreaterThan(0);
    expect(items[0]).toHaveProperty('period');
    expect(items[0]).toHaveProperty('file_name');
  });
});
