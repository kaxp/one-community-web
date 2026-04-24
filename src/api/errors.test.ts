import { describe, expect, it } from 'vitest';
import { ApiError, USER_MESSAGES } from './errors';

describe('ApiError', () => {
  it('fromEnvelope maps known code to friendly message', () => {
    const err = ApiError.fromEnvelope({ code: 'otp_invalid', message: 'raw backend text' }, 400);
    expect(err.code).toBe('otp_invalid');
    expect(err.userMessage).toBe(USER_MESSAGES['otp_invalid']);
    expect(err.status).toBe(400);
  });

  it('fromEnvelope falls back to backend message when code unknown', () => {
    const err = ApiError.fromEnvelope(
      { code: 'unknown_code_xyz', message: 'Raw backend text' },
      500,
    );
    expect(err.userMessage).toBe('Raw backend text');
  });
});
