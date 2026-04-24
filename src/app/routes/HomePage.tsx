import { Navigate } from 'react-router-dom';
import { useAuthStore } from '@/auth/auth-store';
import type { UserRole } from '@/types/enums';

const DEFAULT_BY_ROLE: Record<UserRole, string> = {
  admin: '/admin',
  super_admin: '/admin',
  lp: '/search',
  potential_lp: '/search',
  vc: '/search',
  startup_funded: '/search',
  partner: '/search',
  startup_inprogress: '/pitch',
  startup_onboarded: '/pitch',
  advisor: '/connections/pending',
};

export function HomePage() {
  const { token, expiresAt, role } = useAuthStore.getState();
  const isAuthed = Boolean(token && expiresAt && expiresAt > Date.now());
  if (!isAuthed) return <Navigate to="/signin" replace />;
  const target = role ? DEFAULT_BY_ROLE[role] : '/dashboard';
  return <Navigate to={target} replace />;
}
