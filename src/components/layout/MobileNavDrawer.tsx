import { useState } from 'react';
import { Menu } from 'lucide-react';
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { BrandLogo } from '@/components/brand/BrandLogo';
import { NavList } from './NavList';

// Drawer-style navigation for tablet + mobile (< lg). Triggered by a hamburger
// button rendered inline in the TopBar at sub-lg viewports. See CLAUDE.md §7.11
// and PRD §10.1. Closes itself when a nav link is clicked so the user lands
// directly on the chosen route without an extra dismiss tap.
export function MobileNavDrawer() {
  const [open, setOpen] = useState(false);
  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="lg:hidden" aria-label="Open navigation">
          <Menu className="h-5 w-5" aria-hidden />
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="flex flex-col gap-4 p-0">
        <div className="flex items-center gap-3 border-b border-border px-4 py-3">
          <BrandLogo size={28} />
          <SheetTitle className="text-base">One Community</SheetTitle>
        </div>
        <div className="flex-1 overflow-y-auto px-3 pb-4">
          <NavList onItemClick={() => setOpen(false)} />
        </div>
      </SheetContent>
    </Sheet>
  );
}
