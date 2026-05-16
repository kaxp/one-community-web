import { NavLink } from 'react-router-dom';
import * as Icons from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useRole } from '@/auth/use-auth';
import { navForRole, resolvedLabel, type NavItem } from '@/lib/role-capabilities';
import { cn } from '@/lib/cn';

const ICON_REGISTRY = Icons as unknown as Record<string, LucideIcon>;

function NavIcon({ name, className }: { name: string; className?: string }) {
  const Cmp = ICON_REGISTRY[name];
  if (!Cmp) return null;
  return className === undefined ? <Cmp /> : <Cmp className={className} />;
}

const ADMIN_SECTION_LABELS: Record<string, string> = {
  core: 'Core',
  operations: 'Operations',
  system: 'System',
};

interface Props {
  onItemClick?: () => void;
  className?: string;
}

function NavItemLink({
  item,
  role,
  onItemClick,
}: {
  item: NavItem;
  role: ReturnType<typeof useRole>;
  onItemClick?: (() => void) | undefined;
}) {
  const label = resolvedLabel(item, role);
  return (
    <NavLink
      key={item.key}
      to={item.path}
      end={item.path === '/dashboard'}
      onClick={onItemClick}
      className={({ isActive }) =>
        cn(
          'flex min-h-11 items-center gap-3 rounded-md border-l-2 border-transparent px-3 py-2 text-sm font-medium text-ink-body transition-colors hover:bg-surface hover:text-ink-heading',
          isActive && 'border-brand bg-brand/10 text-brand',
        )
      }
    >
      <NavIcon name={item.icon} className="h-4 w-4" />
      <span>{label}</span>
    </NavLink>
  );
}

// The single navigation list rendered in both the desktop sidebar and the mobile/tablet
// drawer. Per CLAUDE.md §7.11 + PRD §10.1, navigation MUST be reachable at every
// viewport — drawer below lg, persistent sidebar at lg+.
export function NavList({ onItemClick, className }: Props) {
  const role = useRole();
  const items = navForRole(role);
  const isAdmin = role === 'admin' || role === 'super_admin';

  if (!isAdmin) {
    return (
      <nav className={cn('flex flex-col gap-1', className)} aria-label="Primary">
        {items.map((item) => (
          <NavItemLink key={item.key} item={item} role={role} onItemClick={onItemClick} />
        ))}
      </nav>
    );
  }

  // Admin: group by adminSection with section headers and dividers.
  // Items without adminSection (e.g. dashboard) are rendered first ungrouped.
  const ungrouped = items.filter((i) => !i.adminSection);
  const sections = (['core', 'operations', 'system'] as const).map((s) => ({
    key: s,
    label: ADMIN_SECTION_LABELS[s],
    items: items.filter((i) => i.adminSection === s),
  }));

  return (
    <nav className={cn('flex flex-col gap-1', className)} aria-label="Primary">
      {ungrouped.map((item) => (
        <NavItemLink key={item.key} item={item} role={role} onItemClick={onItemClick} />
      ))}

      {sections.map(({ key, label, items: sectionItems }) => {
        if (sectionItems.length === 0) return null;
        return (
          <div key={key} className="mt-3">
            <div className="mb-1 px-3 pt-1">
              <div className="border-t border-border" />
              <p className="mt-2 text-[10px] font-semibold uppercase tracking-widest text-ink-muted">
                {label}
              </p>
            </div>
            {sectionItems.map((item) => (
              <NavItemLink key={item.key} item={item} role={role} onItemClick={onItemClick} />
            ))}
          </div>
        );
      })}
    </nav>
  );
}
