import { format, parse, parseISO } from 'date-fns';
import { AlertTriangle, FileUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ErrorState } from '@/components/error-state/ErrorState';
import { Skeleton } from '@/components/ui/skeleton';
import { useMisForm } from '@/features/mis/hooks/use-mis-form';

// PRD §7.9 — MIS file-upload page (decisions.md [P-23], 2026-04-27).
//
// The structured JSON form has been retired. MIS is now a file upload:
//   1. GET /portfolio/mis   — company name + current period + last submission
//   2. POST /portfolio/mis  — multipart/form-data (file + period + comment)
//   3. GET /portfolio/mis/history — past uploads list
//
// TODO (Builder): replace the placeholder card below with:
//   <FileDropzone accept={{xlsx/csv/pdf}} onFiles={...} />
//   + period display (read-only) + optional comment textarea
//   + upload button (ExecutionPanel<MISUploadInput, MISUploadResponse>)
//   + history list using useInfiniteQuery(qk.mis.history)
//   See PRD §7.9.2 for the exact FormData shape (buildMISFormData helper in schemas.ts).
//
// Financial metrics (revenue_monthly, burn_monthly, runway_months) are now
// in the pitch profile — see /pitch page.
export function MISPage() {
  const formQ = useMisForm();

  if (formQ.isLoading) {
    return (
      <div className="flex flex-col gap-4" data-testid="mis-loading">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-48 w-full" />
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
  const periodLabel = formatPeriodLabel(form.current_period);
  const lastSub = form.last_submission;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-3xl font-semibold text-ink-heading">Monthly MIS</h1>
        <p className="text-sm text-ink-muted">
          {form.company_name} · {periodLabel}
        </p>
      </div>

      {lastSub ? (
        <div
          role="alert"
          data-testid="mis-already-submitted-banner"
          className="flex items-start gap-3 rounded-lg border border-warning/30 bg-warning/5 p-4 text-sm"
        >
          <AlertTriangle className="mt-0.5 h-5 w-5 text-warning" aria-hidden />
          <div className="flex flex-col gap-1">
            <p className="font-semibold text-ink-heading">
              MIS for {periodLabel} already uploaded
              {lastSub.submitted_at ? ` on ${format(parseISO(lastSub.submitted_at), 'PPP')}` : ''}
            </p>
            {lastSub.file_name ? (
              <p className="text-ink-body">
                File:{' '}
                {lastSub.file_url ? (
                  <a
                    href={lastSub.file_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-brand underline"
                  >
                    {lastSub.file_name}
                  </a>
                ) : (
                  <span>{lastSub.file_name}</span>
                )}
              </p>
            ) : null}
            <p className="text-ink-muted">Upload a new file below to replace this submission.</p>
          </div>
        </div>
      ) : null}

      {/* TODO: Replace with full upload form (Builder session — see comment at top of file) */}
      <Card>
        <CardHeader>
          <CardTitle>Upload your MIS report</CardTitle>
          <CardDescription>
            Upload your Excel, Tally export, CSV, or PDF MIS document for {periodLabel}. The file
            will be stored in your company&apos;s Drive folder.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col items-center gap-4 py-10 text-center">
          <FileUp className="h-12 w-12 text-ink-muted" aria-hidden />
          <p className="text-sm text-ink-muted">
            Drag and drop your MIS file here, or click to browse.
          </p>
          <Button variant="outline" disabled>
            Select file (coming soon)
          </Button>
          <p className="text-xs text-ink-muted">
            Supported: Excel (.xlsx / .xls), CSV, PDF, Tally export · Max 20 MB
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

function formatPeriodLabel(period: string): string {
  try {
    return format(parse(period, 'yyyy-MM', new Date()), 'LLLL yyyy');
  } catch {
    return period;
  }
}
