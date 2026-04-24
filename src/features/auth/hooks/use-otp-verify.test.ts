import { describe, expect, it } from 'vitest';
import { waitFor } from '@testing-library/react';
import { renderHookWithProviders } from '@/test/hook-utils';
import { useOtpVerify } from './use-otp-verify';

describe('useOtpVerify', () => {
  it('returns a JWT + role for a seeded LP phone + 000000', async () => {
    const { result } = renderHookWithProviders(() => useOtpVerify());

    result.current.mutate({ phone: '+911234567892', otp: '000000' });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.access_token).toMatch(/msw-jwt\./);
    expect(result.current.data?.role).toBe('lp');
    expect(result.current.data?.expires_in).toBe(14400);
  });

  it('returns 401 otp_invalid for a wrong code', async () => {
    const { result } = renderHookWithProviders(() => useOtpVerify());

    result.current.mutate({ phone: '+911234567892', otp: '111111' });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error?.code).toBe('otp_invalid');
    expect(result.current.error?.status).toBe(401);
  });

  it('returns 401 otp_invalid for an unseeded phone', async () => {
    const { result } = renderHookWithProviders(() => useOtpVerify());

    result.current.mutate({ phone: '+919999999999', otp: '000000' });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error?.code).toBe('otp_invalid');
  });
});
