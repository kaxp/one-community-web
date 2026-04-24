import { create } from 'zustand';
import { persist, createJSONStorage, type StateStorage } from 'zustand/middleware';
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

// Resilient storage factory — if localStorage isn't available (tests, SSR), fall back to
// an in-memory map so `persist` doesn't crash on setItem.
function resolveStorage(): StateStorage {
  if (typeof window !== 'undefined' && typeof window.localStorage?.setItem === 'function') {
    return window.localStorage;
  }
  const mem = new Map<string, string>();
  return {
    getItem: (k) => mem.get(k) ?? null,
    setItem: (k, v) => {
      mem.set(k, v);
    },
    removeItem: (k) => {
      mem.delete(k);
    },
  };
}

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
      storage: createJSONStorage(resolveStorage),
    },
  ),
);
