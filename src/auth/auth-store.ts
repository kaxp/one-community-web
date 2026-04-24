import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { UserProfile } from '@/types/domain';
import type { UserRole } from '@/types/enums';

export interface AuthState {
  token: string | null;
  user: UserProfile | null;
  role: UserRole | null;
  expiresAt: number | null;
  setSession(args: { token: string; user: UserProfile; expiresAt: number }): void;
  setUser(user: UserProfile): void;
  clear(): void;
  isAuthenticated(): boolean;
}

const SCHEMA_VERSION = 1;

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      token: null,
      user: null,
      role: null,
      expiresAt: null,
      setSession: ({ token, user, expiresAt }) => set({ token, user, role: user.role, expiresAt }),
      setUser: (user) => set({ user, role: user.role }),
      clear: () => set({ token: null, user: null, role: null, expiresAt: null }),
      isAuthenticated: () => {
        const { token, expiresAt } = get();
        if (!token || !expiresAt) return false;
        return expiresAt > Date.now();
      },
    }),
    {
      name: 'oc.auth',
      version: SCHEMA_VERSION,
      storage: createJSONStorage(() => localStorage),
    },
  ),
);
