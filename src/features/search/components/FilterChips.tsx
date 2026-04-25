import { X } from 'lucide-react';
import { STARTUP_STAGES } from '@/features/onboarding/schemas';
import type { SearchFilters } from '@/features/search/schemas';
import { stageLabel } from '@/features/search/lib/labels';
import { cn } from '@/lib/cn';

const SECTOR_OPTIONS = [
  'fintech',
  'saas',
  'healthtech',
  'climate',
  'consumer',
  'deeptech',
  'agritech',
  'edtech',
] as const;
const GEOGRAPHY_OPTIONS = ['IN', 'IN-KA', 'IN-MH', 'IN-DL', 'SEA', 'US', 'EU', 'ME'] as const;

interface ChipRowProps<T extends string> {
  label: string;
  options: readonly T[];
  selected: readonly T[];
  onToggle: (value: T) => void;
  formatLabel?: (v: T) => string;
}

function ChipRow<T extends string>({
  label,
  options,
  selected,
  onToggle,
  formatLabel,
}: ChipRowProps<T>) {
  return (
    <div className="flex flex-col gap-2 md:flex-row md:items-center">
      <span className="text-xs font-semibold uppercase tracking-wide text-ink-muted md:w-20">
        {label}
      </span>
      <div className="flex flex-wrap gap-2">
        {options.map((opt) => {
          const isSelected = selected.includes(opt);
          return (
            <button
              key={opt}
              type="button"
              onClick={() => onToggle(opt)}
              className={cn(
                'min-h-9 rounded-full border px-3 py-1 text-xs font-medium transition-colors',
                isSelected
                  ? 'border-brand bg-brand/10 text-brand'
                  : 'border-border bg-surface text-ink-body hover:bg-surface-muted',
              )}
              aria-pressed={isSelected}
            >
              {formatLabel ? formatLabel(opt) : opt}
            </button>
          );
        })}
      </div>
    </div>
  );
}

interface Props {
  filters: SearchFilters;
  onChange(next: SearchFilters): void;
}

// URL-backed multi-select chips (PRD §7.4.1 transformation note: filters persist via
// URL search params for share-links). Three groups: sector / stage / geography.
export function FilterChips({ filters, onChange }: Props) {
  const sectors = filters.sector ?? [];
  const stages = filters.stage ?? [];
  const geographies = filters.geography ?? [];

  const toggle = <K extends keyof SearchFilters>(key: K, value: string) => {
    const current = (filters[key] ?? []) as string[];
    const next = current.includes(value) ? current.filter((v) => v !== value) : [...current, value];
    const updated: SearchFilters = { ...filters };
    if (next.length === 0) delete updated[key];
    else (updated as Record<string, string[]>)[key as string] = next;
    onChange(updated);
  };

  const hasAny = sectors.length + stages.length + geographies.length > 0;

  return (
    <section
      aria-label="Filters"
      className="flex flex-col gap-3 rounded-lg border border-border bg-surface p-4"
    >
      <ChipRow
        label="Sector"
        options={SECTOR_OPTIONS}
        selected={sectors as (typeof SECTOR_OPTIONS)[number][]}
        onToggle={(v) => toggle('sector', v)}
      />
      <ChipRow
        label="Stage"
        options={STARTUP_STAGES}
        selected={stages as (typeof STARTUP_STAGES)[number][]}
        onToggle={(v) => toggle('stage', v)}
        formatLabel={(s) => stageLabel(s)}
      />
      <ChipRow
        label="Geography"
        options={GEOGRAPHY_OPTIONS}
        selected={geographies as (typeof GEOGRAPHY_OPTIONS)[number][]}
        onToggle={(v) => toggle('geography', v)}
      />
      {hasAny ? (
        <button
          type="button"
          onClick={() => onChange({})}
          className="self-start text-xs font-medium text-brand hover:underline"
        >
          <X className="mr-1 inline h-3 w-3" aria-hidden /> Clear all filters
        </button>
      ) : null}
    </section>
  );
}
