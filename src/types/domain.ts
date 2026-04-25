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
  // PRD §7.1.3 + §7.11.4 — `/auth/me` carries `home_city`; the travel page
  // updates it via PUT /travel/home-city. Optional/nullable since older
  // /auth/me payloads (and zustand-persist snapshots) may omit it.
  home_city?: string | null;
}
