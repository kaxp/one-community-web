import type { ReactNode } from 'react';
import { LockedField } from '@/features/search/components/LockedField';

interface Props {
  label: string;
  value: ReactNode | null | undefined;
  isMasked: boolean;
}

// Renders a labelled row. When the value is missing:
//   • masked viewer (partner)  → blurred LockedField placeholder.
//   • non-masked viewer         → row hidden entirely.
//
// Mirrors the pattern in `<ResultCard>` so partner-view UX stays consistent
// across surfaces (decisions.md [P-21]).
export function InfoRow({ label, value, isMasked }: Props) {
  const hasValue = value !== null && value !== undefined && value !== '';
  if (!hasValue) {
    if (isMasked) {
      return (
        <div className="flex flex-col gap-1">
          <span className="text-xs font-semibold uppercase tracking-wide text-ink-muted">
            {label}
          </span>
          <LockedField lines={1} />
        </div>
      );
    }
    return null;
  }
  return (
    <div className="flex flex-col gap-1">
      <span className="text-xs font-semibold uppercase tracking-wide text-ink-muted">{label}</span>
      <span className="text-sm text-ink-heading">{value}</span>
    </div>
  );
}
