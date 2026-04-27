import { describe, expect, it } from 'vitest';
import { waitFor } from '@testing-library/react';
import { renderHookWithProviders } from '@/test/hook-utils';
import { useMisForm } from './use-mis-form';
import { useAuthStore } from '@/auth/auth-store';
import { setMisMswScenario } from '@/test/msw-fixtures/mis-handlers';

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

describe('useMisForm (PRD §7.9.1 — file-upload redesign)', () => {
  it('resolves with company name + current period when no prior submission', async () => {
    signedInStartup();
    const { result } = renderHookWithProviders(() => useMisForm());
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.current_period).toBe('2026-04');
    expect(result.current.data?.company_name).toBe('Acme Technologies');
    expect(result.current.data?.last_submission).toBeNull();
  });

  it('includes last_submission when already uploaded', async () => {
    signedInStartup();
    setMisMswScenario('already_submitted');
    const { result } = renderHookWithProviders(() => useMisForm());
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.last_submission?.file_name).toBe('MIS-Apr-2026.xlsx');
    expect(result.current.data?.last_submission?.period).toBe('2026-04');
  });

  it('surfaces a 500 as ApiError', async () => {
    signedInStartup();
    setMisMswScenario('error_500');
    const { result } = renderHookWithProviders(() => useMisForm());
    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error?.code).toBe('internal_error');
  });
});
