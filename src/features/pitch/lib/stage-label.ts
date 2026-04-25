import { STARTUP_STAGES } from '@/features/onboarding/schemas';

type StartupStage = (typeof STARTUP_STAGES)[number];

const LABELS: Record<StartupStage, string> = {
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

export function stageLabel(stage: StartupStage | null | undefined): string {
  if (!stage) return '—';
  return LABELS[stage];
}

// PRD §8.12.2 — `ask_amount_cr` is INR crore. Render as "₹ 10 Cr".
export function formatCrore(value: number | null | undefined): string {
  if (value === null || value === undefined) return '—';
  return `₹ ${value.toLocaleString('en-IN')} Cr`;
}
