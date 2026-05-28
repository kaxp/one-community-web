/**
 * Magic-link landing page — /auth/magic?token=<JWT>
 *
 * Flow:
 *  1. Extract ?token= from URL.
 *  2. Strip it from the address bar immediately (history.replaceState) so
 *     it never appears in browser history or referrer headers.
 *  3. Decode the JWT payload (no library needed — base64url middle segment)
 *     to get exp + role so we can seed the auth store before calling /auth/me.
 *  4. Call GET /auth/me with the token to validate and hydrate the full profile.
 *  5. On success → store session → navigate to /dashboard.
 *  6. On failure → clear session → navigate to /signin.
 *
 * Security posture:
 *  - Token stripped from URL before any async work (step 2 is synchronous).
 *  - Token is signed with SERVER_JWT_SECRET; the backend rejects forgeries.
 *  - Short-lived by default (60 min). Admin can pass --expires N to gen_magic_link.py.
 *  - No single-use enforcement yet — same link works until exp. Add jti nonce
 *    in Redis if you need one-time guarantees.
 */
import { useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { useAuthStore } from '@/auth/auth-store';
import { getMe } from '@/api/endpoints';
import { profileFromMe } from '@/features/auth/lib/hydrate-session';
import { nextRouteForUser } from '@/features/auth/lib/post-signin-navigate';
import { isSafeNextPath } from '@/features/auth/lib/safe-next-path';
import type { UserRole } from '@/types/enums';
import type { UserProfile } from '@/types/domain';

function decodeJwtPayload(token: string): {
  exp?: number;
  user_id?: string;
  role?: string;
  sub?: string;
} {
  try {
    const parts = token.split('.');
    if (parts.length < 3) return {};
    const payloadB64 = parts[1]!;
    // base64url → base64 standard
    const padded = payloadB64.replace(/-/g, '+').replace(/_/g, '/');
    return JSON.parse(atob(padded));
  } catch {
    return {};
  }
}

export function MagicLinkPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const attempted = useRef(false);

  useEffect(() => {
    if (attempted.current) return;
    attempted.current = true;

    const token = searchParams.get('token');
    const nextRaw = searchParams.get('next');
    const next = isSafeNextPath(nextRaw) ? nextRaw : null;

    if (!token) {
      navigate('/signin', { replace: true });
      return;
    }

    // Strip token from URL immediately — before any await.
    // replaceState keeps the current history entry but removes the token so it
    // won't appear in browser history or leak via Referer headers. We strip
    // `?next=` too — it's already captured in `next` above.
    window.history.replaceState({}, '', '/auth/magic');

    const payload = decodeJwtPayload(token);

    if (!payload.exp || !payload.user_id || !payload.role) {
      navigate('/signin', { replace: true });
      return;
    }

    const expiresAt = payload.exp * 1000; // JWT exp is seconds, store wants ms
    if (expiresAt <= Date.now()) {
      navigate('/signin', { replace: true });
      return;
    }

    // Seed a minimal profile so apiClient sends Authorization: Bearer <token>
    // on the upcoming /auth/me call.
    const seeded: UserProfile = {
      id: payload.user_id,
      phone: payload.sub ?? '',
      role: payload.role as UserRole,
      name: null,
      email: null,
      organisation: null,
      profile_complete: false,
    };

    useAuthStore.getState().setSession({ token, user: seeded, expiresAt });

    getMe()
      .then((me) => {
        useAuthStore.getState().setUser(profileFromMe(me));
        // Phase B deep link: backend mints magic links with `?next=<path>`
        // pointing at the specific page the user asked for in the WA menu
        // (e.g. /digest, /opportunities). Honor it when set; otherwise fall
        // back to the role-based default landing.
        const target = next ?? nextRouteForUser(me);
        navigate(target, { replace: true });
      })
      .catch(() => {
        useAuthStore.getState().clear();
        navigate('/signin', { replace: true });
      });
  }, [navigate, searchParams]);

  return (
    <main className="flex min-h-screen items-center justify-center bg-background">
      <div className="flex flex-col items-center gap-3 text-muted-foreground">
        <Loader2 className="h-8 w-8 animate-spin" aria-hidden />
        <p className="text-sm">Signing you in…</p>
      </div>
    </main>
  );
}
