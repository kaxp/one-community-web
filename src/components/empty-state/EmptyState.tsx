import type { ReactNode } from 'react';
import { Inbox, type LucideIcon } from 'lucide-react';
import { cn } from '@/lib/cn';

interface Props {
  icon?: LucideIcon;
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}

export function EmptyState({ icon: Icon = Inbox, title, description, action, className }: Props) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-border bg-surface p-10 text-center',
        className,
      )}
    >
      <div className="rounded-full bg-surface-muted p-3">
        <Icon className="h-6 w-6 text-ink-muted" />
      </div>
      <h3 className="text-lg font-semibold text-ink-heading">{title}</h3>
      {description ? <p className="max-w-sm text-sm text-ink-muted">{description}</p> : null}
      {action ? <div className="pt-2">{action}</div> : null}
    </div>
  );
}
