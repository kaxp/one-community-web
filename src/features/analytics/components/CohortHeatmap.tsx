import type { CohortRow } from '@/features/analytics/schemas';
import { cn } from '@/lib/cn';

interface Props {
  rows: CohortRow[];
}

const WINDOWS: {
  key: 'retained_1m' | 'retained_3m' | 'retained_6m' | 'retained_12m';
  label: string;
}[] = [
  { key: 'retained_1m', label: '1 mo' },
  { key: 'retained_3m', label: '3 mo' },
  { key: 'retained_6m', label: '6 mo' },
  { key: 'retained_12m', label: '12 mo' },
];

function pct(retained: number | null | undefined, size: number): string | null {
  if (retained === null || retained === undefined || size === 0) return null;
  return `${Math.round((retained / size) * 100)}%`;
}

function bucketColor(retained: number | null | undefined, size: number): string {
  if (retained === null || retained === undefined || size === 0) return 'bg-surface-muted';
  const ratio = retained / size;
  if (ratio >= 0.8) return 'bg-success/30 text-ink-heading';
  if (ratio >= 0.6) return 'bg-success/20 text-ink-heading';
  if (ratio >= 0.4) return 'bg-warning/20 text-ink-heading';
  if (ratio >= 0.2) return 'bg-warning/30 text-ink-heading';
  return 'bg-error/15 text-ink-heading';
}

// PRD §7.14.5 — monthly cohort retention table rendered as a heatmap.
// Cells = `retained_Nm / cohort_size`. Null cells (not enough history)
// render "—" with a muted background.
export function CohortHeatmap({ rows }: Props) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="border-b border-border bg-surface-muted">
            <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-ink-muted">
              Cohort
            </th>
            <th className="px-3 py-2 text-right text-xs font-semibold uppercase tracking-wide text-ink-muted">
              Size
            </th>
            {WINDOWS.map((w) => (
              <th
                key={w.key}
                className="px-3 py-2 text-center text-xs font-semibold uppercase tracking-wide text-ink-muted"
              >
                {w.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.cohort} className="border-b border-border last:border-b-0">
              <td className="px-3 py-2 font-medium text-ink-heading">{row.cohort}</td>
              <td className="px-3 py-2 text-right text-xs text-ink-body">
                {row.cohort_size.toLocaleString('en-IN')}
              </td>
              {WINDOWS.map((w) => {
                const value = row[w.key] ?? null;
                const label = pct(value, row.cohort_size);
                return (
                  <td key={w.key} className="px-1 py-1">
                    <div
                      className={cn(
                        'flex items-center justify-center rounded-md py-2 text-sm font-medium',
                        bucketColor(value, row.cohort_size),
                      )}
                      title={
                        label
                          ? `${value} of ${row.cohort_size} retained at ${w.label}`
                          : `${w.label} not yet elapsed`
                      }
                    >
                      {label ?? '—'}
                    </div>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
