import { useMutation } from '@tanstack/react-query';
import type { ApiError } from '@/api/errors';
import { verifyOtp } from '@/api/endpoints';
import type { OtpVerifyRequest, OtpVerifyResponse } from '@/features/auth/schemas';

export function useOtpVerify() {
  return useMutation<OtpVerifyResponse, ApiError, OtpVerifyRequest>({
    mutationFn: verifyOtp,
  });
}
