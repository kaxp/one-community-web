import { CheckCircle2, AlertTriangle, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/cn';
import type { AIEvaluationResult, AISignal } from '@/features/pitch/schemas';

// PRD §7.3.4 + §8.12.2 — green/yellow/red badge keyed off `result.signal`.
// `recommended_lp_types` rendered as opaque chips (no link-through).

const SIGNAL_META: Record<
  AISignal,
  {
    label: string;
    Icon: typeof CheckCircle2;
    badgeClass: string;
  }
> = {
  strong: {
    label: 'Strong signal',
    Icon: CheckCircle2,
    badgeClass: 'border-success/40 bg-success/10 text-success',
  },
  moderate: {
    label: 'Moderate signal',
    Icon: AlertCircle,
    badgeClass: 'border-warning/40 bg-warning/10 text-warning',
  },
  weak: {
    label: 'Weak signal',
    Icon: AlertTriangle,
    badgeClass: 'border-error/40 bg-error/10 text-error',
  },
};

export function AIEvaluationCard({ result }: { result: AIEvaluationResult }) {
  const meta = SIGNAL_META[result.signal];
  const Icon = meta.Icon;
  const showWeakProminence = result.signal === 'weak';

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-3">
        <span
          className={cn(
            'inline-flex items-center gap-2 rounded-full border px-3 py-1 text-sm font-medium',
            meta.badgeClass,
          )}
          data-testid={`ai-signal-${result.signal}`}
        >
          <Icon className="h-4 w-4" aria-hidden />
          {meta.label}
        </span>
        <h3 className="text-base font-semibold text-ink-heading">AI evaluation</h3>
      </div>

      <p className="text-sm text-ink-body">{result.summary}</p>

      {result.strengths.length > 0 ? (
        <div>
          <h4 className="text-sm font-semibold text-ink-heading">Strengths</h4>
          <ul className="mt-1 list-disc pl-5 text-sm text-ink-body">
            {result.strengths.map((s, i) => (
              <li key={i}>{s}</li>
            ))}
          </ul>
        </div>
      ) : null}

      {result.concerns.length > 0 ? (
        <div className={cn(showWeakProminence && 'rounded-md bg-error/5 p-3')}>
          <h4 className="text-sm font-semibold text-ink-heading">Concerns</h4>
          <ul className="mt-1 list-disc pl-5 text-sm text-ink-body">
            {result.concerns.map((c, i) => (
              <li key={i}>{c}</li>
            ))}
          </ul>
        </div>
      ) : null}

      {result.recommended_lp_types.length > 0 ? (
        <div>
          <h4 className="text-sm font-semibold text-ink-heading">Recommended LP types</h4>
          <ul className="mt-2 flex flex-wrap gap-2">
            {result.recommended_lp_types.map((tag) => (
              <li
                key={tag}
                className="rounded-full border border-border bg-surface-muted px-3 py-1 text-xs text-ink-body"
              >
                {tag}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
