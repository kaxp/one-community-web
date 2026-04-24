import { NavLink } from 'react-router-dom';
import * as Icons from 'lucide-react';
import { useRole } from '@/auth/use-auth';
import { navForRole } from '@/lib/role-capabilities';
import { cn } from '@/lib/cn';

type IconName = keyof typeof Icons;

function SidebarIcon({ name, className }: { name: string; className?: string }) {
  const registry = Icons as unknown as Record<string, React.ComponentType<{ className?: string }>>;
  const Cmp = registry[name as IconName];
  if (!Cmp) return null;
  return className === undefined ? <Cmp /> : <Cmp className={className} />;
}

export function Sidebar() {
  const role = useRole();
  const items = navForRole(role);

  return (
    <aside className="hidden w-60 shrink-0 border-r border-border bg-surface-muted lg:block">
      <nav className="flex h-full flex-col gap-1 p-3">
        {items.map((item) => (
          <NavLink
            key={item.key}
            to={item.path}
            end={item.path === '/dashboard'}
            className={({ isActive }) =>
              cn(
                'flex items-center gap-3 rounded-md border-l-2 border-transparent px-3 py-2 text-sm font-medium text-ink-body transition-colors hover:bg-surface hover:text-ink-heading',
                isActive && 'border-brand bg-brand/10 text-brand',
              )
            }
          >
            <SidebarIcon name={item.icon} className="h-4 w-4" />
            <span>{item.label}</span>
          </NavLink>
        ))}
      </nav>
    </aside>
  );
}
