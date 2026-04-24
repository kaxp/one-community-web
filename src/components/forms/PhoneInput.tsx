import { forwardRef } from 'react';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/cn';

interface Props extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type'> {
  countryCode?: string;
}

export const PhoneInput = forwardRef<HTMLInputElement, Props>(
  ({ countryCode = '+91', className, ...props }, ref) => {
    return (
      <div className="flex items-center gap-2">
        <span
          aria-hidden
          className="inline-flex h-10 items-center rounded-md border border-border bg-surface-muted px-3 text-sm text-ink-body"
        >
          {countryCode}
        </span>
        <Input
          ref={ref}
          type="tel"
          inputMode="numeric"
          autoComplete="tel-national"
          placeholder="98765 43210"
          className={cn('flex-1', className)}
          {...props}
        />
      </div>
    );
  },
);
PhoneInput.displayName = 'PhoneInput';
