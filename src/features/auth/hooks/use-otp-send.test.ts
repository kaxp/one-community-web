import { describe, expect, it } from 'vitest';
import { waitFor } from '@testing-library/react';
import { renderHookWithProviders } from '@/test/hook-utils';
import { useOtpSend } from './use-otp-send';
import { queueOtpSendError } from '@/test/msw-fixtures/auth-handlers';

describe('useOtpSend', () => {
  it('returns success for a valid phone', async () => {
    const { result } = renderHookWithProviders(() => useOtpSend());

    result.current.mutate({ phone: '+911234567892' });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.message).toBe('OTP sent successfully');
  });

  it('surfaces a 422 validation error as ApiError', async () => {
    const { result } = renderHookWithProviders(() => useOtpSend());

    result.current.mutate({ phone: 'not-a-phone' as unknown as string });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error?.code).toBe('validation_error');
  });

  it('surfaces a 429 rate_limit as ApiError', async () => {
    queueOtpSendError({ status: 429, code: 'rate_limit_exceeded', message: 'Too many requests' });
    const { result } = renderHookWithProviders(() => useOtpSend());

    result.current.mutate({ phone: '+911234567892' });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error?.code).toBe('rate_limit_exceeded');
    expect(result.current.error?.status).toBe(429);
  });
});
