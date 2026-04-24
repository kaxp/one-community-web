import type { UserRole } from './enums';

// Placeholder profile shape for Stage 1 chassis. Real endpoints fill in per feature session.
export interface UserProfile {
  id: string;
  phone: string;
  role: UserRole;
  name: string | null;
  email: string | null;
  organisation: string | null;
  profile_complete: boolean;
}
