import { NavLink } from 'react-router-dom';
import * as Icons from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useRole } from '@/auth/use-auth';
import { navForRole, resolvedLabel } from '@/lib/role-capabilities';
import { cn } from '@/lib/cn';

const ICON_REGISTRY = Icons as unknown as Record<string, LucideIcon>;

function NavIcon({ name, className }: { name: string; className?: string }) {
  const Cmp = ICON_REGISTRY[name];
  if (!Cmp) return null;
  return className === undefined ? <Cmp /> : <Cmp className={className} />;
}

interface Props {
  onItemClick?: () => void;
  className?: string;
}

// The single navigation list rendered in both the desktop sidebar and the mobile/tablet
// drawer. Per CLAUDE.md §7.11 + PRD §10.1, navigation MUST be reachable at every
// viewport — drawer below lg, persistent sidebar at lg+.
export function NavList({ onItemClick, className }: Props) {
  const role = useRole();
  const items = navForRole(role);
  return (
    <nav className={cn('flex flex-col gap-1', className)} aria-label="Primary">
      {items.map((item) => {
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
      })}
    </nav>
  );
}
