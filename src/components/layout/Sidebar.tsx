import { NavList } from './NavList';

// Persistent left sidebar for desktop (lg+). Tablet (768–1023px) and mobile (<768px)
// reach navigation via <MobileNavDrawer> from the TopBar — see CLAUDE.md §7.11 and
// PRD §10.1. Do NOT collapse this rule away: every viewport must surface the nav.
export function Sidebar() {
  return (
    <aside
      className="hidden w-60 shrink-0 border-r border-border bg-surface-muted lg:block"
      aria-label="Primary sidebar"
    >
      {/* overflow-y-auto gives the sidebar its own scroll controller so nav
          items scroll independently of the main content area */}
      <div className="h-full overflow-y-auto overscroll-contain p-3">
        <NavList />
      </div>
    </aside>
  );
}
