import { useAuthStore } from './auth-store';
import type { UserProfile } from '@/types/domain';
import type { UserRole } from '@/types/enums';

export function useUser(): UserProfile | null {
  return useAuthStore((s) => s.user);
}

export function useRole(): UserRole | null {
  return useAuthStore((s) => s.role);
}

export function useIsAuthenticated(): boolean {
  return useAuthStore((s) => (s.token && s.expiresAt ? s.expiresAt > Date.now() : false));
}
