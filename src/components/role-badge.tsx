import { Badge } from '@/components/ui/badge';
import { roleColour } from '@/lib/role-colours';
import { cn } from '@/lib/cn';
import type { UserRole } from '@/types/enums';

interface Props {
  role: UserRole;
  className?: string;
}

export function RoleBadge({ role, className }: Props) {
  const c = roleColour(role);
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium',
        c.bg,
        c.text,
        className,
      )}
    >
      {c.label}
    </span>
  );
}

// Re-export Badge for consumers that want raw variants.
export { Badge };
