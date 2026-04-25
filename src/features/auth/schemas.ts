import { z } from 'zod';
import { zE164, zUUID } from '@/lib/zod-helpers';

export const zOtpSendRequest = z.object({
  phone: zE164,
});
export type OtpSendRequest = z.infer<typeof zOtpSendRequest>;

export const zOtpSendResponse = z.object({
  message: z.string(),
});
export type OtpSendResponse = z.infer<typeof zOtpSendResponse>;

export const zOtpVerifyRequest = z.object({
  phone: zE164,
  otp: z.string().regex(/^\d{6}$/, 'OTP must be a 6-digit code'),
});
export type OtpVerifyRequest = z.infer<typeof zOtpVerifyRequest>;

export const zUserRole = z.enum([
  'lp',
  'potential_lp',
  'vc',
  'startup_inprogress',
  'startup_onboarded',
  'startup_funded',
  'partner',
  'advisor',
  'admin',
  'super_admin',
]);

export const zOtpVerifyResponse = z.object({
  access_token: z.string().min(1),
  token_type: z.literal('bearer'),
  expires_in: z.number().int().positive(),
  user_id: zUUID,
  role: zUserRole,
});
export type OtpVerifyResponse = z.infer<typeof zOtpVerifyResponse>;

export const zAuthMeResponse = z.object({
  user_id: zUUID,
  phone: zE164,
  name: z.string().nullable(),
  email: z.string().email().nullable(),
  role: zUserRole,
  organisation: z.string().nullable(),
  designation: z.string().nullable(),
  avatar_url: z.string().nullable(),
  profile_complete: z.boolean(),
  // §7.11.4 invalidation note — /auth/me carries home_city. Optional+nullable
  // so older backends still parse cleanly.
  home_city: z.string().nullable().optional(),
});
export type AuthMeResponse = z.infer<typeof zAuthMeResponse>;

// The sign-in form accepts either a bare Indian mobile (10 digits) or a full E.164 string.
// `toE164` + `isValidE164` in the submit handler do the canonical check.
export const zPhoneInput = z.object({
  phone: z
    .string()
    .trim()
    .min(1, 'Enter your mobile number')
    .regex(/^(\+?\d{10,15})$/, 'Enter a valid mobile number'),
});
export type PhoneInput = z.infer<typeof zPhoneInput>;

export const zOtpForm = z.object({
  otp: z.string().regex(/^\d{6}$/, 'Enter the 6-digit code'),
});
export type OtpForm = z.infer<typeof zOtpForm>;
