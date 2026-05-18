/**
 * Phase H.1 — session-expiry auto-redirect.
 *
 * Mounts a background check that detects when the OTP session token
 * expires (4 h TTL) and redirects to /signin so the user gets the
 * sign-in form instead of a broken, 401-heavy UI.
 *
 * Two triggers:
 *  1. window focus — catches the common case of a user leaving the tab
 *     open for several hours and returning to a stale session.
 *  2. 60-second interval — catches expiry during active use without
 *     requiring any user interaction.
 *
 * On expiry detection:
 *  - All per-user search conversations are cleared from sessionStorage
 *    so the next user starts fresh on the same browser.
 *  - The auth store is cleared.
 *  - The router navigates to /signin with replace so the expired page
 *    is not in the browser history.
 *
 * Mount this hook once in <AppShell> (the authenticated layout root).
 */
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from './auth-store';
import { clearAllSearchConversations } from '@/features/search/hooks/use-conversation';

const CHECK_INTERVAL_MS = 60_000; // 60 s

export function useSessionExpiry(): void {
  const navigate = useNavigate();

  useEffect(() => {
    function handleExpiry() {
      const { isAuthenticated, clear } = useAuthStore.getState();
      if (!isAuthenticated()) {
        clearAllSearchConversations();
        clear();
        navigate('/signin', { replace: true });
      }
    }

    // Check immediately on mount (handles the page-reload-with-stale-token
    // case that RequireAuth might miss between renders).
    handleExpiry();

    const interval = setInterval(handleExpiry, CHECK_INTERVAL_MS);
    window.addEventListener('focus', handleExpiry);

    return () => {
      clearInterval(interval);
      window.removeEventListener('focus', handleExpiry);
    };
  }, [navigate]);
}
