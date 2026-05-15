import { Link } from 'react-router-dom';
import { LogOut, User as UserIcon } from 'lucide-react';
import { useUser } from '@/auth/use-auth';
import { useAuthStore } from '@/auth/auth-store';
import { BrandLogo } from '@/components/brand/BrandLogo';
// import { RoleBadge } from '@/components/role-badge';
import { Button } from '@/components/ui/button';
import { MobileNavDrawer } from './MobileNavDrawer';

export function TopBar() {
  const user = useUser();

  const onLogout = () => {
    useAuthStore.getState().clear();
    window.location.href = '/signin';
  };

  return (
    <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-border bg-surface px-4 md:px-6">
      <div className="flex items-center gap-2">
        <MobileNavDrawer />
        <Link to="/dashboard" className="flex items-center gap-2">
          <BrandLogo />
          <span className="hidden text-lg font-semibold text-ink-heading md:inline">
            One Community
          </span>
          <span className="text-lg font-semibold text-ink-heading md:hidden">One Community</span>
        </Link>
      </div>

      <div className="flex items-center gap-3">
        {user ? (
          <div className="hidden items-center gap-2 md:flex">
            <Link
              to="/my-profile"
              className="flex items-center gap-2 rounded-md border border-border bg-surface px-2 py-1 text-sm transition-colors hover:bg-surface-muted"
            >
              <UserIcon className="h-4 w-4 text-ink-muted" aria-hidden />
              <span className="text-ink-heading">{user.name ?? user.phone}</span>
            </Link>
            {/* <RoleBadge role={user.role} /> */}
          </div>
        ) : null}
        <Button size="sm" variant="ghost" onClick={onLogout} aria-label="Sign out">
          <LogOut className="h-4 w-4" aria-hidden />
          <span className="hidden md:inline">Sign out</span>
        </Button>
      </div>
    </header>
  );
}
