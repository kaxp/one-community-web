import { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DEV_SEED_USERS } from '@/lib/dev-seed-users';
import { cn } from '@/lib/cn';

interface Props {
  onPick(phone: string): void;
}

// Dev-only affordance: quick role switcher via seeded phone numbers. Tree-shaken in prod
// by the `import.meta.env.DEV` guard in the parent component.
export function DevPhoneHelper({ onPick }: Props) {
  const [open, setOpen] = useState(false);
  return (
    <div className="rounded-md border border-brand/30 bg-brand/5 p-3 text-sm">
      <button
        type="button"
        className="flex w-full items-center justify-between font-medium text-ink-heading"
        onClick={() => setOpen((v) => !v)}
      >
        <span>Dev seed users</span>
        <ChevronDown
          className={cn('h-4 w-4 transition-transform', open && 'rotate-180')}
          aria-hidden
        />
      </button>
      {open ? (
        <div className="mt-2 grid grid-cols-1 gap-1 sm:grid-cols-2">
          {DEV_SEED_USERS.map((u) => (
            <Button
              key={u.phone}
              type="button"
              variant="ghost"
              size="sm"
              className="justify-start font-mono text-xs"
              onClick={() => onPick(u.phone)}
            >
              {u.role}: {u.phone}
            </Button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
