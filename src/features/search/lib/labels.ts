// PRD §7.4.1 transformation note: stage values are ENUM keys; convert to display labels.
const STAGE_LABELS: Record<string, string> = {
  ideation: 'Ideation',
  pre_seed: 'Pre-Seed',
  seed: 'Seed',
  early_growth: 'Early Growth',
  pre_a: 'Pre-A',
  series_a: 'Series A',
  pre_b: 'Pre-B',
  series_b: 'Series B',
  late_growth: 'Late Growth',
};

export function stageLabel(stage: string | null | undefined): string {
  if (!stage) return '—';
  return STAGE_LABELS[stage] ?? stage;
}

export function fmtCr(value: number | null | undefined): string {
  if (value === null || value === undefined || Number.isNaN(value)) return '—';
  return `₹${value} Cr`;
}

export function fmtChequeRange(min?: number | null, max?: number | null): string {
  if (min === null || min === undefined) {
    if (max === null || max === undefined) return '—';
    return `up to ₹${max} Cr`;
  }
  if (max === null || max === undefined) return `from ₹${min} Cr`;
  return `₹${min}–${max} Cr`;
}
