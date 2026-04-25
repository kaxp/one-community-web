import { Lock } from 'lucide-react';
import { cn } from '@/lib/cn';

interface Props {
  /** Number of blurred lines to render. Defaults to 1. */
  lines?: number;
  /** Optional label rendered above the bars (e.g. "Asking", "Traction"). */
  label?: string;
  /** Optional class name applied to the wrapper. */
  className?: string;
  /** Tone — `panel` adds a brand-tinted background (matches AI-reason callout). */
  tone?: 'inline' | 'panel';
}

// Crunchbase-style locked placeholder. Renders the exact shape the field
// would have (label + bars) with a blur filter and a small lock indicator,
// so partners see the structure-of-the-data without the data itself. The
// allowlist on the backend stops the data from reaching the client; this
// component only styles the missing-by-design fields.
export function LockedField({ lines = 1, label, className, tone = 'inline' }: Props) {
  const isPanel = tone === 'panel';
  return (
    <div
      className={cn(
        'relative overflow-hidden',
        isPanel && 'rounded-md border border-brand/20 bg-brand/5 p-2',
        className,
      )}
      aria-label={label ? `${label} (locked)` : 'Locked field'}
    >
      {label ? (
        <p className="mb-1 flex items-center gap-1 text-xs font-semibold text-ink-muted">
          <Lock className="h-3 w-3" aria-hidden />
          {label}
        </p>
      ) : null}
      <div className="flex flex-col gap-1.5 select-none" aria-hidden>
        {Array.from({ length: lines }).map((_, i) => (
          <span
            key={i}
            className={cn(
              'block h-3 rounded bg-ink-muted/40 blur-[2px]',
              // Vary widths so the placeholder reads as paragraph-shaped, not bar-shaped.
              i % 3 === 0 ? 'w-full' : i % 3 === 1 ? 'w-11/12' : 'w-3/4',
            )}
          />
        ))}
      </div>
    </div>
  );
}
