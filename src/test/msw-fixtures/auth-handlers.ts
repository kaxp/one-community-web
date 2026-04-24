import { http, HttpResponse, type HttpHandler } from 'msw';
import { seedProfileFor } from './seed-users';
import { DEV_OTP_BYPASS_CODE } from '@/lib/dev-seed-users';

// Module-scoped state for MSW-only session hydration. Tests call `resetMswAuthState()`
// between cases via the afterEach hook in setup.ts.
let currentPhone: string | null = null;
let profileCompleteOverride: Record<string, boolean> = {};
let nextPhoneError: { status: number; code: string; message: string } | null = null;
let nextVerifyError: { status: number; code: string; message: string } | null = null;

export function resetMswAuthState() {
  currentPhone = null;
  profileCompleteOverride = {};
  nextPhoneError = null;
  nextVerifyError = null;
}

export function setMswSignedInPhone(phone: string | null) {
  currentPhone = phone;
}

export function setMswProfileComplete(phone: string, complete: boolean) {
  profileCompleteOverride[phone] = complete;
}

export function queueOtpSendError(err: { status: number; code: string; message: string }) {
  nextPhoneError = err;
}

export function queueOtpVerifyError(err: { status: number; code: string; message: string }) {
  nextVerifyError = err;
}

export const authHandlers: HttpHandler[] = [
  http.post('*/api/v1/auth/otp/send', async ({ request }) => {
    const body = (await request.json()) as { phone?: string };
    if (nextPhoneError) {
      const err = nextPhoneError;
      nextPhoneError = null;
      return HttpResponse.json(
        { data: null, error: { code: err.code, message: err.message } },
        { status: err.status },
      );
    }
    if (!body.phone || !/^\+[1-9]\d{6,14}$/.test(body.phone)) {
      return HttpResponse.json(
        {
          data: null,
          error: {
            code: 'validation_error',
            message: 'Validation failed',
            detail: [
              {
                loc: ['body', 'phone'],
                msg: 'Phone must be in E.164 format (e.g. +91XXXXXXXXXX)',
                type: 'value_error',
              },
            ],
          },
        },
        { status: 422 },
      );
    }
    return HttpResponse.json({ data: { message: 'OTP sent successfully' }, error: null });
  }),

  http.post('*/api/v1/auth/otp/verify', async ({ request }) => {
    const body = (await request.json()) as { phone?: string; otp?: string };
    if (nextVerifyError) {
      const err = nextVerifyError;
      nextVerifyError = null;
      return HttpResponse.json(
        { data: null, error: { code: err.code, message: err.message } },
        { status: err.status },
      );
    }
    if (!body.phone || !body.otp || !/^\d{6}$/.test(body.otp)) {
      return HttpResponse.json(
        {
          data: null,
          error: { code: 'validation_error', message: 'Validation failed' },
        },
        { status: 422 },
      );
    }
    const profile = seedProfileFor(body.phone);
    if (!profile || body.otp !== DEV_OTP_BYPASS_CODE) {
      return HttpResponse.json(
        { data: null, error: { code: 'otp_invalid', message: 'Invalid OTP' } },
        { status: 401 },
      );
    }
    currentPhone = body.phone;
    return HttpResponse.json({
      data: {
        access_token: 'msw-jwt.' + profile.user_id,
        token_type: 'bearer',
        expires_in: 14400,
        user_id: profile.user_id,
        role: profile.role,
      },
      error: null,
    });
  }),

  http.get('*/api/v1/auth/me', ({ request }) => {
    const auth = request.headers.get('Authorization');
    if (!auth?.startsWith('Bearer ')) {
      return HttpResponse.json(
        { data: null, error: { code: 'missing_token', message: 'Missing token' } },
        { status: 401 },
      );
    }
    if (!currentPhone) {
      return HttpResponse.json(
        { data: null, error: { code: 'invalid_token', message: 'Unknown session' } },
        { status: 401 },
      );
    }
    const profile = seedProfileFor(currentPhone);
    if (!profile) {
      return HttpResponse.json(
        { data: null, error: { code: 'not_found', message: 'User not found' } },
        { status: 404 },
      );
    }
    const override = profileCompleteOverride[currentPhone];
    const data =
      override === undefined
        ? profile
        : { ...profile, profile_complete: override, name: override ? profile.name : null };
    return HttpResponse.json({ data, error: null });
  }),

  http.patch('*/api/v1/onboarding/profile', async ({ request }) => {
    const auth = request.headers.get('Authorization');
    if (!auth?.startsWith('Bearer ')) {
      return HttpResponse.json(
        { data: null, error: { code: 'missing_token', message: 'Missing token' } },
        { status: 401 },
      );
    }
    const body = (await request.json()) as { name?: string; email?: string };
    if (!body.name || body.name.trim().length === 0) {
      return HttpResponse.json(
        {
          data: null,
          error: {
            code: 'validation_error',
            message: 'Validation failed',
            detail: [{ loc: ['body', 'name'], msg: 'Name is required', type: 'value_error' }],
          },
        },
        { status: 422 },
      );
    }
    if (body.email === 'taken@example.com') {
      return HttpResponse.json(
        {
          data: null,
          error: {
            code: 'conflict',
            message: 'Email already belongs to another user',
            detail: { field: 'email' },
          },
        },
        { status: 409 },
      );
    }
    if (!currentPhone) {
      return HttpResponse.json(
        { data: null, error: { code: 'invalid_token', message: 'Unknown session' } },
        { status: 401 },
      );
    }
    const profile = seedProfileFor(currentPhone);
    if (!profile) {
      return HttpResponse.json(
        { data: null, error: { code: 'not_found', message: 'User not found' } },
        { status: 404 },
      );
    }
    profileCompleteOverride[currentPhone] = true;
    return HttpResponse.json({
      data: {
        user_id: profile.user_id,
        name: body.name,
        role: profile.role,
        profile_complete: true,
      },
      error: null,
    });
  }),

  http.post('*/api/v1/onboarding/lp-profile', async ({ request }) => {
    const auth = request.headers.get('Authorization');
    if (!auth?.startsWith('Bearer ')) {
      return HttpResponse.json(
        { data: null, error: { code: 'missing_token', message: 'Missing token' } },
        { status: 401 },
      );
    }
    const body = (await request.json()) as { fund_name?: string };
    if (!currentPhone) {
      return HttpResponse.json(
        { data: null, error: { code: 'invalid_token', message: 'Unknown session' } },
        { status: 401 },
      );
    }
    const profile = seedProfileFor(currentPhone);
    if (!profile) {
      return HttpResponse.json(
        { data: null, error: { code: 'not_found', message: 'User not found' } },
        { status: 404 },
      );
    }
    if (
      profile.role !== 'lp' &&
      profile.role !== 'potential_lp' &&
      profile.role !== 'admin' &&
      profile.role !== 'super_admin'
    ) {
      return HttpResponse.json(
        {
          data: null,
          error: { code: 'insufficient_role', message: 'Requires LP or admin' },
        },
        { status: 403 },
      );
    }
    return HttpResponse.json({
      data: {
        user_id: profile.user_id,
        fund_name: body.fund_name ?? null,
        profile_complete: true,
      },
      error: null,
    });
  }),
];
