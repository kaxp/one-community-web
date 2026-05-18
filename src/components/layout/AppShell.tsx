import { Outlet } from 'react-router-dom';
import { useSessionExpiry } from '@/auth/use-session-expiry';
import { TopBar } from './TopBar';
import { Sidebar } from './Sidebar';

export function AppShell() {
  // Phase H.1: detect session expiry (60s interval + focus) and redirect
  // to /signin so the user never gets stuck with a stale, 401-heavy UI.
  useSessionExpiry();

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <TopBar />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar />
        <main className="flex-1 overflow-y-auto">
          <div className="mx-auto w-full max-w-content px-4 py-6 md:px-8 md:py-10">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
