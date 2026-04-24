import { useMutation } from '@tanstack/react-query';
import type { ApiError } from '@/api/errors';
import { sendOtp } from '@/api/endpoints';
import type { OtpSendRequest, OtpSendResponse } from '@/features/auth/schemas';

export function useOtpSend() {
  return useMutation<OtpSendResponse, ApiError, OtpSendRequest>({
    mutationFn: sendOtp,
  });
}
