import { useEffect } from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useUser } from './use-auth';
import { useAuthStore } from './auth-store';
import { useMe } from '@/features/auth/hooks/use-me';
import { profileFromMe } from '@/features/auth/lib/hydrate-session';

// Gates access to app routes on `profile_complete === true`.
// Cold-start: refetches /auth/me so the persisted `user` snapshot is accurate.
// If profile_complete=false, redirect to /onboarding/profile.
export function ProfileGate() {
  const user = useUser();
  const me = useMe({ enabled: user !== null });

  useEffect(() => {
    if (me.data) {
      useAuthStore.getState().setUser(profileFromMe(me.data));
    }
  }, [me.data]);

  if (me.isError && me.error && 'status' in me.error && me.error.status === 401) {
    useAuthStore.getState().clear();
    return <Navigate to="/signin" replace />;
  }

  if (user && user.profile_complete === false) {
    return <Navigate to="/onboarding/profile" replace />;
  }

  return <Outlet />;
}
