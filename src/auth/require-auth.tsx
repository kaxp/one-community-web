import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuthStore } from './auth-store';

// Session-termination policy (see decisions.md [P-17]): this component is the SOLE
// gate that checks session validity on every render. `expiresAt > Date.now()` is the
// single source of truth. We do NOT listen to any auth:expire events or react to API
// 401s here — those do not terminate the session. Sign-out is either explicit (TopBar)
// or driven by natural expiry (expiresAt elapsing), checked on the next render.
export function RequireAuth() {
  const location = useLocation();
  const isAuthed = useAuthStore((s) => (s.token && s.expiresAt ? s.expiresAt > Date.now() : false));

  if (!isAuthed) {
    return <Navigate to="/signin" replace state={{ from: location.pathname }} />;
  }
  return <Outlet />;
}
