import { useEffect } from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useUser } from './use-auth';
import { useAuthStore } from './auth-store';
import { useMe } from '@/features/auth/hooks/use-me';
import { profileFromMe } from '@/features/auth/lib/hydrate-session';

// Gates app routes on `profile_complete === true`.
//
// Cold-start: refetches /auth/me so the persisted snapshot is accurate.
//
// Session-termination policy (see decisions.md [P-17]): if /auth/me fails (network,
// 401, 5xx, anything), we DO NOT clear the session or redirect to /signin. The
// JWT's `expiresAt` in RequireAuth is the only gate. We fall back to the persisted
// user snapshot (from zustand/persist) and let the user keep working. When the
// backend recovers, a later refetch will resync.
export function ProfileGate() {
  const user = useUser();
  const me = useMe({ enabled: user !== null });

  useEffect(() => {
    if (me.data) {
      useAuthStore.getState().setUser(profileFromMe(me.data));
    }
  }, [me.data]);

  if (user && user.profile_complete === false) {
    return <Navigate to="/onboarding/profile" replace />;
  }

  return <Outlet />;
}
