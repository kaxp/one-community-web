import { useState } from 'react';
import { cn } from '@/lib/cn';

interface Props {
  className?: string;
  size?: number;
}

export function BrandLogo({ className, size = 32 }: Props) {
  const [broken, setBroken] = useState(false);
  const showFallback = broken;

  if (showFallback) {
    return (
      <span
        aria-hidden
        className={cn(
          'flex items-center justify-center rounded-full bg-brand text-brand-foreground font-semibold',
          className,
        )}
        style={{ height: size, width: size, fontSize: size * 0.5 }}
      >
        W
      </span>
    );
  }

  return (
    <img
      src="/brand/logo.png"
      alt="Warmup Ventures"
      height={size}
      width={size}
      className={cn('h-8 w-auto rounded-sm object-contain', className)}
      onError={() => setBroken(true)}
    />
  );
}
