import type { UserProfile } from '@/types/domain';
import type { AuthMeResponse, OtpVerifyResponse } from '@/features/auth/schemas';

export function profileFromMe(me: AuthMeResponse): UserProfile {
  return {
    id: me.user_id,
    phone: me.phone,
    role: me.role,
    name: me.name,
    email: me.email,
    organisation: me.organisation,
    profile_complete: me.profile_complete,
    home_city: me.home_city ?? null,
  };
}

export function seedProfileFromVerify(verify: OtpVerifyResponse, phone: string): UserProfile {
  return {
    id: verify.user_id,
    phone,
    role: verify.role,
    name: null,
    email: null,
    organisation: null,
    profile_complete: false,
    home_city: null,
  };
}

export function expiresAtFrom(verify: OtpVerifyResponse): number {
  return Date.now() + verify.expires_in * 1000;
}
