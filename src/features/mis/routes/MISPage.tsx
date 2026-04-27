import { useEffect, useState } from 'react';
import { format, formatDistanceToNow, parse, parseISO } from 'date-fns';
import { AlertTriangle, ExternalLink, FileText, X } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ErrorState } from '@/components/error-state/ErrorState';
import { EmptyState } from '@/components/empty-state/EmptyState';
import { Skeleton } from '@/components/ui/skeleton';
import { ExecutionPanel } from '@/components/execution-panel';
import { FormField } from '@/components/forms/FormField';
import { FileDropzone } from '@/components/forms/FileDropzone';
import { useMisForm } from '@/features/mis/hooks/use-mis-form';
import { useMisHistory } from '@/features/mis/hooks/use-mis-prefill';
import { useUploadMisWithFile } from '@/features/mis/hooks/use-upload-mis-with-file';
import {
  validateMISFile,
  zMISUploadInput,
  type MISHistoryItem,
  type MISUploadInput,
  type MISUploadResponse,
} from '@/features/mis/schemas';

// PRD §7.9 — MIS file-upload page (decisions.md [P-23], 2026-04-27).
//
// File upload (Excel / Tally / CSV / PDF) replaces the structured JSON form.
// Three endpoints in play:
//   1. GET  /portfolio/mis           — company name + current period + last submission
//   2. POST /portfolio/mis           — multipart upload (file + period + comment)
//   3. GET  /portfolio/mis/history   — past uploads list
//
// Financial operating metrics (revenue_monthly, burn_monthly, runway_months)
// have moved to the pitch profile — see `<StartupProfileForm>` on /pitch.
export function MISPage() {
  const formQ = useMisForm();
  const historyQ = useMisHistory();
  const [file, setFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const uploadMutation = useUploadMisWithFile(file);

  // Clear the picked file once a submission succeeds so the dropzone re-arms
  // for the next month. Driven by mutation.isSuccess (not onSuccess inside
  // the hook) so the success card in the panel can render the freshly-saved
  // result before we wipe local state.
  useEffect(() => {
    if (uploadMutation.isSuccess && file !== null) {
      setFile(null);
    }
  }, [uploadMutation.isSuccess, file]);

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

  const onPickFile = (files: File[]) => {
    const next = files[0] ?? null;
    if (!next) {
      setFile(null);
      setFileError(null);
      return;
    }
    const err = validateMISFile(next);
    if (err) {
      setFileError(err);
      setFile(null);
      return;
    }
    setFileError(null);
    setFile(next);
    // Reset any prior mutation error so the panel doesn't keep showing it
    // after the user picks a new file.
    uploadMutation.reset();
  };

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

      <ExecutionPanel<MISUploadInput, MISUploadResponse>
        title="Upload your MIS report"
        description={`Upload your Excel, Tally export, CSV, or PDF MIS document for ${periodLabel}. The file will be stored in your company's Drive folder.`}
        schema={zMISUploadInput}
        defaultValues={{ period: form.current_period, comment: '' }}
        mutation={uploadMutation}
        submitLabel={lastSub ? 'Replace MIS' : 'Upload MIS'}
        onSuccessToast={() => `MIS uploaded for ${periodLabel}`}
        renderResult={() => (
          <div className="flex items-start gap-3 rounded-lg border border-success/30 bg-success/5 p-4 text-sm">
            <FileText className="mt-0.5 h-5 w-5 text-success" aria-hidden />
            <div className="flex flex-col gap-1">
              <p className="font-semibold text-ink-heading">MIS uploaded for {periodLabel}</p>
              <p className="text-ink-muted">
                Your file is in the company Drive folder; the admin will be notified.
              </p>
            </div>
          </div>
        )}
        renderForm={({ register, watch }) => {
          const watchedPeriod = watch('period');
          return (
            <div className="flex flex-col gap-4">
              <FormField
                label="Reporting period"
                htmlFor="mis-period"
                hint="The current month is auto-selected; admins can backfill via Drive."
              >
                <input
                  id="mis-period"
                  type="hidden"
                  value={watchedPeriod ?? form.current_period}
                  {...register('period')}
                />
                <p
                  className="rounded-md border border-border bg-surface-muted px-3 py-2 text-sm font-medium text-ink-heading"
                  data-testid="mis-period-display"
                >
                  {periodLabel}
                </p>
              </FormField>

              <FormField label="MIS file" htmlFor="mis-file" error={fileError ?? undefined}>
                {file ? (
                  <div
                    className="flex items-center justify-between gap-3 rounded-md border border-border bg-surface-muted p-3 text-sm"
                    data-testid="mis-file-chip"
                  >
                    <div className="flex min-w-0 items-center gap-2">
                      <FileText className="h-4 w-4 flex-none text-ink-muted" aria-hidden />
                      <span className="truncate font-medium text-ink-heading">{file.name}</span>
                      <span className="text-xs text-ink-muted">
                        {(file.size / 1024).toFixed(0)} KB
                      </span>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setFile(null)}
                      aria-label="Remove file"
                      data-testid="mis-file-remove"
                    >
                      <X className="h-4 w-4" aria-hidden />
                    </Button>
                  </div>
                ) : (
                  <FileDropzone
                    onFiles={onPickFile}
                    accept={{
                      'application/vnd.ms-excel': ['.xls'],
                      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': [
                        '.xlsx',
                      ],
                      'text/csv': ['.csv'],
                      'application/pdf': ['.pdf'],
                      'application/octet-stream': ['.tally'],
                    }}
                    label="Drop your MIS file or click to browse"
                  />
                )}
                <p className="mt-1 text-xs text-ink-muted">
                  Supported: Excel (.xlsx / .xls), CSV, PDF, Tally export · Max 20 MB
                </p>
              </FormField>

              <FormField
                label="Comment (optional)"
                htmlFor="mis-comment"
                hint="Add context for the admin reviewing this file. Up to 2,000 characters."
              >
                <textarea
                  id="mis-comment"
                  rows={3}
                  maxLength={2000}
                  className="rounded-md border border-border bg-surface p-3 text-sm text-ink-heading focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
                  placeholder="Closed Q1 with strong recurring revenue, Tally export attached."
                  {...register('comment')}
                />
              </FormField>
            </div>
          );
        }}
      />

      <Card>
        <CardHeader>
          <CardTitle>Past submissions</CardTitle>
          <CardDescription>
            All MIS reports you&apos;ve uploaded, newest first. Files open in a new tab.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <HistoryList
            isLoading={historyQ.isLoading}
            isError={historyQ.isError}
            items={historyQ.data?.items ?? []}
            onRetry={() => {
              void historyQ.refetch();
            }}
            error={historyQ.error}
          />
        </CardContent>
      </Card>
    </div>
  );
}

interface HistoryListProps {
  isLoading: boolean;
  isError: boolean;
  items: MISHistoryItem[];
  onRetry(): void;
  error: ReturnType<typeof useMisHistory>['error'];
}

function HistoryList({ isLoading, isError, items, onRetry, error }: HistoryListProps) {
  if (isLoading) {
    return (
      <div className="flex flex-col gap-2" data-testid="mis-history-loading">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-14 w-full" />
        ))}
      </div>
    );
  }
  if (isError) {
    return <ErrorState error={error} compact onRetry={onRetry} />;
  }
  if (items.length === 0) {
    return (
      <EmptyState
        icon={FileText}
        title="No MIS reports uploaded yet."
        description="Upload your first MIS file above. Past submissions will appear here for quick access."
      />
    );
  }
  return (
    <ul className="flex flex-col gap-2" data-testid="mis-history-list">
      {items.map((row) => (
        <li
          key={row.submission_id}
          className="flex flex-col gap-2 rounded-md border border-border p-3 text-sm sm:flex-row sm:items-center sm:justify-between"
        >
          <div className="flex flex-col gap-0.5">
            <span className="font-semibold text-ink-heading">{formatPeriodLabel(row.period)}</span>
            {row.comment ? <span className="text-ink-body">{row.comment}</span> : null}
            {row.submitted_at ? (
              <span
                className="text-xs text-ink-muted"
                title={format(parseISO(row.submitted_at), 'PPpp')}
              >
                {formatDistanceToNow(parseISO(row.submitted_at), { addSuffix: true })}
              </span>
            ) : null}
          </div>
          {row.file_url && row.file_name ? (
            <Button asChild size="sm" variant="outline">
              <a
                href={row.file_url}
                target="_blank"
                rel="noopener noreferrer"
                data-testid={`mis-history-link-${row.submission_id}`}
              >
                <ExternalLink className="h-3.5 w-3.5" aria-hidden />
                <span className="truncate">{row.file_name}</span>
              </a>
            </Button>
          ) : row.file_name ? (
            <span className="text-xs text-ink-muted">{row.file_name}</span>
          ) : null}
        </li>
      ))}
    </ul>
  );
}

function formatPeriodLabel(period: string): string {
  try {
    return format(parse(period, 'yyyy-MM', new Date()), 'LLLL yyyy');
  } catch {
    return period;
  }
}
