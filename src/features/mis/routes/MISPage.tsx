import { format, parse } from 'date-fns';
import { AlertTriangle } from 'lucide-react';
import { ErrorState } from '@/components/error-state/ErrorState';
import { Skeleton } from '@/components/ui/skeleton';
import { useMisForm } from '@/features/mis/hooks/use-mis-form';
import { useMisPrefill } from '@/features/mis/hooks/use-mis-prefill';
import { MISForm } from '@/features/mis/components/MISForm';

// PRD §7.9 — monthly MIS submission page. Two parallel queries on mount:
//   • useMisForm     — current-month form schema + already_submitted flag
//   • useMisPrefill  — last month's values (used as a fallback if the form
//                      response carries no prefill of its own).
// 409 conflict is handled by the form's <ExecutionPanel> ErrorState — the
// form values are retained, never cleared.
export function MISPage() {
  const formQ = useMisForm();
  const prefillQ = useMisPrefill();

  if (formQ.isLoading) {
    return (
      <div className="flex flex-col gap-4" data-testid="mis-loading">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (formQ.isError || !formQ.data) {
    return (
      <ErrorState
        error={formQ.error}
        onRetry={() => {
          void formQ.refetch();
        }}
      />
    );
  }

  const form = formQ.data;
  const prefill = form.prefill ?? prefillQ.data?.prefill ?? null;
  const periodLabel = formatPeriodLabel(form.period);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-3xl font-semibold text-ink-heading">Monthly MIS</h1>
        <p className="text-sm text-ink-muted">
          {form.company_name} · {periodLabel}
        </p>
      </div>

      {form.already_submitted ? (
        <div
          role="alert"
          data-testid="mis-already-submitted-banner"
          className="flex items-start gap-3 rounded-lg border border-warning/30 bg-warning/5 p-4 text-sm"
        >
          <AlertTriangle className="mt-0.5 h-5 w-5 text-warning" aria-hidden />
          <div className="flex flex-col gap-1">
            <p className="font-semibold text-ink-heading">
              MIS for {periodLabel} was already submitted
              {form.last_submission_at
                ? ` on ${formatSubmissionTime(form.last_submission_at)}`
                : ''}
              .
            </p>
            <p className="text-ink-body">
              Submitting again will be rejected with a 409. Contact your admin if you need to
              override the existing entry.
            </p>
          </div>
        </div>
      ) : null}

      <MISForm period={form.period} prefill={prefill} disabled={form.already_submitted} />
    </div>
  );
}

// PRD §8.12.2 — `YYYY-MM` → `April 2026`.
function formatPeriodLabel(period: string): string {
  try {
    return format(parse(period, 'yyyy-MM', new Date()), 'LLLL yyyy');
  } catch {
    return period;
  }
}

function formatSubmissionTime(iso: string): string {
  try {
    return format(new Date(iso), 'PPP');
  } catch {
    return iso;
  }
}
