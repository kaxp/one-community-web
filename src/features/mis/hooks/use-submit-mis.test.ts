import { describe, expect, it } from 'vitest';
import { waitFor } from '@testing-library/react';
import { renderHookWithProviders } from '@/test/hook-utils';
import { useUploadMis } from './use-submit-mis';
import { useAuthStore } from '@/auth/auth-store';
import { setMisUploadMswScenario } from '@/test/msw-fixtures/mis-handlers';
import { buildMISFormData } from '@/features/mis/schemas';

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

function makeFormData(filename = 'MIS.xlsx') {
  const file = new File(['data'], filename, { type: 'text/csv' });
  return buildMISFormData({ period: '2026-04', comment: 'Note' }, file);
}

describe('useUploadMis (PRD §7.9.2)', () => {
  it('returns upload ack on success', async () => {
    signedInStartup();
    const { result } = renderHookWithProviders(() => useUploadMis());
    result.current.mutate(makeFormData());
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.period).toBe('2026-04');
    expect(result.current.data?.file_name).toBe('MIS-Apr-2026.xlsx');
    expect(result.current.data?.file_url).toMatch(/drive\.google\.com/);
  });

  it('surfaces 409 mis_already_submitted as ApiError', async () => {
    signedInStartup();
    setMisUploadMswScenario('conflict_409');
    const { result } = renderHookWithProviders(() => useUploadMis());
    result.current.mutate(makeFormData());
    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error?.code).toBe('mis_already_submitted');
    expect(result.current.error?.status).toBe(409);
  });

  it('surfaces 422 bad mime as ApiError', async () => {
    signedInStartup();
    setMisUploadMswScenario('bad_mime_422');
    const { result } = renderHookWithProviders(() => useUploadMis());
    result.current.mutate(makeFormData('photo.png'));
    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error?.code).toBe('validation_error');
  });
});
