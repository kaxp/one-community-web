import { cn } from '@/lib/cn';

const STAGE_COLORS: Record<string, string> = {
  ideation: 'bg-slate-100 text-slate-600',
  pre_seed: 'bg-sky-100 text-sky-700',
  seed: 'bg-cyan-100 text-cyan-700',
  pre_series_a: 'bg-teal-100 text-teal-700',
  series_a: 'bg-emerald-100 text-emerald-700',
  series_b: 'bg-lime-100 text-lime-700',
  series_c: 'bg-orange-100 text-orange-700',
  growth: 'bg-pink-100 text-pink-700',
  late_growth: 'bg-rose-100 text-rose-700',
};

export const STAGE_DISPLAY: Record<string, string> = {
  ideation: 'Ideation',
  pre_seed: 'Pre-Seed',
  seed: 'Seed',
  pre_series_a: 'Pre-Series A',
  series_a: 'Series A',
  series_b: 'Series B',
  series_c: 'Series C',
  growth: 'Growth',
  late_growth: 'Late Growth',
};

export const STAGE_FILTER_OPTIONS = Object.entries(STAGE_DISPLAY).map(([value, label]) => ({
  value,
  label,
}));

export function StartupStageBadge({ stage }: { stage: string | null | undefined }) {
  if (!stage) return <span className="text-sm text-ink-muted">—</span>;
  return (
    <span
      className={cn(
        'inline-flex items-center whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-medium',
        STAGE_COLORS[stage] ?? 'bg-slate-100 text-slate-600',
      )}
    >
      {STAGE_DISPLAY[stage] ?? stage}
    </span>
  );
}
