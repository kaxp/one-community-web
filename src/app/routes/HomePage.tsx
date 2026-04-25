import { Navigate } from 'react-router-dom';
import { useAuthStore } from '@/auth/auth-store';

// Visiting "/" while signed in routes to /dashboard for every role
// (decisions.md [P-18] — overrides PRD §10.2 role-home map).
export function HomePage() {
  const { token, expiresAt } = useAuthStore.getState();
  const isAuthed = Boolean(token && expiresAt && expiresAt > Date.now());
  if (!isAuthed) return <Navigate to="/signin" replace />;
  return <Navigate to="/dashboard" replace />;
}
