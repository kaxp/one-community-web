import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useEffect } from 'react';
import { useAuthStore } from './auth-store';

export function RequireAuth() {
  const location = useLocation();
  const isAuthed = useAuthStore((s) => (s.token && s.expiresAt ? s.expiresAt > Date.now() : false));

  useEffect(() => {
    function onExpire() {
      useAuthStore.getState().clear();
    }
    window.addEventListener('auth:expire', onExpire);
    return () => window.removeEventListener('auth:expire', onExpire);
  }, []);

  if (!isAuthed) {
    return <Navigate to="/signin" replace state={{ from: location.pathname }} />;
  }
  return <Outlet />;
}
