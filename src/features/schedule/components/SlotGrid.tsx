import { useMemo } from 'react';
import { format } from 'date-fns';
import { toZonedTime } from 'date-fns-tz';
import { cn } from '@/lib/cn';
import type { Slot } from '@/features/schedule/schemas';
import { viewerTimeZone } from '@/features/schedule/lib/format-tz';

interface Props {
  slots: Slot[];
  // Render an N-day window starting from this date (viewer-local).
  fromDate: string;
  days: number;
  onSlotClick(slot: Slot): void;
}

function cellKey(dateKey: string, timeKey: string): string {
  return `${dateKey}__${timeKey}`;
}

// Backend returns IST timestamps; we display the grid in the VIEWER's local
// TZ so that "10:00 AM" means what the viewer reads on their wall clock. The
// backend's `date` field is IST-relative, so we re-derive both axes in the
// viewer TZ for coherence.
export function SlotGrid({ slots, fromDate, days, onSlotClick }: Props) {
  const tz = viewerTimeZone();

  const { dateKeys, timeKeys, byCell } = useMemo(() => {
    // Build the column axis from the slot set so the grid only shows columns
    // that actually exist (the backend returns business-hour slots, not 24h).
    const timeBuckets = new Set<string>(); // 'HH:mm' (sortable)
    const cellMap = new Map<string, Slot>();
    for (const slot of slots) {
      const zoned = toZonedTime(slot.start, tz);
      const dKey = format(zoned, 'yyyy-MM-dd');
      const tKey = format(zoned, 'HH:mm');
      timeBuckets.add(tKey);
      cellMap.set(cellKey(dKey, tKey), slot);
    }

    // Always render `days` rows starting from `fromDate` even when slots are
    // sparse — keeps the grid structure stable.
    const start = new Date(`${fromDate}T00:00:00`);
    const dKeys: string[] = [];
    for (let i = 0; i < days; i += 1) {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      dKeys.push(format(d, 'yyyy-MM-dd'));
    }
    const tKeys = Array.from(timeBuckets).sort();
    return { dateKeys: dKeys, timeKeys: tKeys, byCell: cellMap };
  }, [slots, fromDate, days, tz]);

  if (timeKeys.length === 0) {
    return null;
  }

  return (
    <div
      className="overflow-x-auto rounded-lg border border-border bg-surface"
      data-testid="slot-grid"
    >
      <table className="w-full text-left text-xs">
        <thead className="border-b border-border bg-surface-muted">
          <tr>
            <th
              scope="col"
              className="sticky left-0 z-10 min-w-[7rem] bg-surface-muted px-3 py-2 font-semibold text-ink-muted"
            >
              Date ({tz})
            </th>
            {timeKeys.map((t) => (
              <th key={t} scope="col" className="px-2 py-2 font-semibold text-ink-muted">
                {format(new Date(`2000-01-01T${t}:00`), 'h:mm a')}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {dateKeys.map((dKey) => (
            <tr key={dKey} className="border-b border-border last:border-b-0">
              <th
                scope="row"
                className="sticky left-0 z-10 whitespace-nowrap bg-surface px-3 py-2 text-left font-medium text-ink-heading"
              >
                {format(new Date(`${dKey}T00:00:00`), 'EEE, d MMM')}
              </th>
              {timeKeys.map((t) => {
                const slot = byCell.get(cellKey(dKey, t));
                if (!slot) {
                  return (
                    <td
                      key={t}
                      className="border-l border-border bg-surface-muted/40 px-2 py-2"
                      aria-label={`Unavailable at ${t} on ${dKey}`}
                    >
                      <span className="block h-6 w-full" aria-hidden />
                    </td>
                  );
                }
                return (
                  <td key={t} className="border-l border-border px-1 py-1">
                    <button
                      type="button"
                      onClick={() => onSlotClick(slot)}
                      data-testid={`slot-${slot.start}`}
                      aria-label={`Available at ${format(toZonedTime(slot.start, tz), 'h:mm a')} on ${format(toZonedTime(slot.start, tz), 'EEE, d MMM')}`}
                      className={cn(
                        'block w-full min-h-9 rounded-md border border-success/40 bg-success/10 px-2 py-1 text-xs font-medium text-success transition-colors',
                        'hover:bg-success/20 focus:outline-none focus:ring-2 focus:ring-success',
                      )}
                    >
                      Book
                    </button>
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
