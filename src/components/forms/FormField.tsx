import type { ReactNode } from 'react';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/cn';

interface Props {
  label: string;
  htmlFor?: string;
  error?: string | undefined;
  hint?: string;
  className?: string;
  children: ReactNode;
}

export function FormField({ label, htmlFor, error, hint, className, children }: Props) {
  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      <Label htmlFor={htmlFor}>{label}</Label>
      {children}
      {error ? (
        <p className="text-xs text-error" role="alert">
          {error}
        </p>
      ) : hint ? (
        <p className="text-xs text-ink-muted">{hint}</p>
      ) : null}
    </div>
  );
}
