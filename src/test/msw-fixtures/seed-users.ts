import { DEV_SEED_USERS } from '@/lib/dev-seed-users';
import type { AuthMeResponse } from '@/features/auth/schemas';

const PHONE_TO_UUID: Record<string, string> = {
  '+918087464723': '00000000-0000-4000-8000-000000000001',
  '+911234567890': '00000000-0000-4000-8000-000000000002',
  '+911234567891': '00000000-0000-4000-8000-000000000003',
  '+911234567892': '00000000-0000-4000-8000-000000000004',
  '+911234567893': '00000000-0000-4000-8000-000000000005',
  '+911234567894': '00000000-0000-4000-8000-000000000006',
  '+911234567895': '00000000-0000-4000-8000-000000000007',
  '+911234567896': '00000000-0000-4000-8000-000000000008',
  '+911234567897': '00000000-0000-4000-8000-000000000009',
  '+911234567898': '00000000-0000-4000-8000-00000000000a',
  '+911234567899': '00000000-0000-4000-8000-00000000000b',
};

export function seedUuidFor(phone: string): string {
  return PHONE_TO_UUID[phone] ?? '00000000-0000-4000-8000-00000000ffff';
}

export function seedProfileFor(phone: string): AuthMeResponse | null {
  const seed = DEV_SEED_USERS.find((u) => u.phone === phone);
  if (!seed) return null;
  return {
    user_id: seedUuidFor(phone),
    phone,
    name: seed.name,
    email: seed.email,
    role: seed.role,
    organisation: null,
    designation: null,
    avatar_url: null,
    profile_complete: true,
  };
}
