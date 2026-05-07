import type { ApiErrorEnvelope } from '@/types/api';

export const USER_MESSAGES: Record<string, string> = {
  validation_error: 'Please check the highlighted fields.',
  not_registered: 'This number is not registered. Please contact Warmup Ventures.',
  otp_invalid: 'The code is incorrect. Please try again.',
  otp_expired: 'The OTP expired. Request a new one.',
  link_expired: 'This link has expired. Please sign in again.',
  token_expired: 'Your session has expired. Please sign in again.',
  insufficient_role: 'You do not have access to this page.',
  forbidden: 'You do not have access to this resource.',
  conflict: 'This action conflicts with the current state.',
  rate_limit_exceeded: 'Too many requests. Please try again shortly.',
  not_found: 'We could not find what you were looking for.',
  mis_already_submitted: 'MIS for this period was already submitted.',
  duplicate_contact: 'This contact already exists in the community.',
  internal_error: 'Something went wrong on our side. Please try again.',
  network_error: 'Network error. Please check your connection.',
};

export class ApiError extends Error {
  public readonly code: string;
  public readonly userMessage: string;
  public readonly status: number;
  public readonly detail?: unknown;
  public readonly retryAfterSeconds?: number;

  constructor(
    code: string,
    userMessage: string,
    status: number,
    detail?: unknown,
    retryAfterSeconds?: number,
  ) {
    super(userMessage);
    this.name = 'ApiError';
    this.code = code;
    this.userMessage = userMessage;
    this.status = status;
    this.detail = detail;
    if (retryAfterSeconds !== undefined) this.retryAfterSeconds = retryAfterSeconds;
  }

  static fromEnvelope(env: ApiErrorEnvelope, status: number, retryAfterSeconds?: number): ApiError {
    const friendly = USER_MESSAGES[env.code] ?? env.message;
    return new ApiError(env.code, friendly, status, env.detail, retryAfterSeconds);
  }
}
