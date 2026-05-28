import { useEffect, useRef } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { useSessionExpiry } from '@/auth/use-session-expiry';
import { TopBar } from './TopBar';
import { Sidebar } from './Sidebar';

// Scroll the main scrollable container to the top whenever the route changes.
function useScrollToTop() {
  const { pathname } = useLocation();
  const mainRef = useRef<HTMLElement | null>(null);
  useEffect(() => {
    mainRef.current?.scrollTo({ top: 0, behavior: 'instant' });
  }, [pathname]);
  return mainRef;
}

export function AppShell() {
  // Phase H.1: detect session expiry (60s interval + focus) and redirect
  // to /signin so the user never gets stuck with a stale, 401-heavy UI.
  useSessionExpiry();
  const mainRef = useScrollToTop();

  return (
    // h-screen (not min-h-screen) bounds the layout to exactly the viewport.
    // Without this the outer div grows with content, causing the *body* to
    // scroll and dragging the sidebar along for the ride.
    <div className="flex h-screen flex-col overflow-hidden bg-background">
      <TopBar />
      {/* min-h-0 overrides flex children's default min-height:auto so the
          inner container can actually be shorter than its content — essential
          for overflow-hidden to clip correctly. */}
      <div className="flex min-h-0 flex-1 overflow-hidden">
        <Sidebar />
        <main ref={mainRef} className="flex-1 overflow-y-auto">
          <div className="mx-auto w-full max-w-content px-4 py-6 md:px-8 md:py-10">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
