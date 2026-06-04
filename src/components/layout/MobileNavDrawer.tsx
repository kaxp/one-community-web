import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Menu, User as UserIcon, ChevronRight } from 'lucide-react';
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { BrandLogo } from '@/components/brand/BrandLogo';
import { NavList } from './NavList';
import { useUser } from '@/auth/use-auth';

// Drawer-style navigation for tablet + mobile (< lg). Triggered by a hamburger
// button rendered inline in the TopBar at sub-lg viewports. See CLAUDE.md §7.11
// and PRD §10.1. Closes itself when a nav link is clicked so the user lands
// directly on the chosen route without an extra dismiss tap.
export function MobileNavDrawer() {
  const [open, setOpen] = useState(false);
  const user = useUser();

  const close = () => setOpen(false);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="lg:hidden" aria-label="Open navigation">
          <Menu className="h-5 w-5" aria-hidden />
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="flex flex-col gap-0 p-0">
        <div className="flex items-center gap-3 border-b border-border px-4 py-3">
          <BrandLogo size={28} />
          <SheetTitle className="text-base">One Community</SheetTitle>
        </div>

        {/* Profile row — mobile access to profile page */}
        {user ? (
          <Link
            to="/my-profile"
            onClick={close}
            className="flex items-center justify-between gap-3 border-b border-border px-4 py-3 hover:bg-surface-muted transition-colors"
          >
            <div className="flex items-center gap-3 min-w-0">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand/10">
                <UserIcon className="h-4 w-4 text-brand" aria-hidden />
              </div>
              <div className="min-w-0">
                <div className="truncate text-sm font-medium text-ink-heading">
                  {user.name ?? user.phone}
                </div>
              </div>
            </div>
            <ChevronRight className="h-4 w-4 shrink-0 text-ink-muted" aria-hidden />
          </Link>
        ) : null}

        {/* overscroll-contain prevents scroll from propagating to the background page */}
        <div className="flex-1 overflow-y-auto overscroll-contain px-3 pb-4 pt-2">
          <NavList onItemClick={close} />
        </div>
      </SheetContent>
    </Sheet>
  );
}
