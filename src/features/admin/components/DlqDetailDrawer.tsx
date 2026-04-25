import { Sheet, SheetContent, SheetDescription, SheetTitle } from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { format, formatDistanceToNow, parseISO } from 'date-fns';
import type { DeadLetterJob } from '@/features/admin/schemas';

interface Props {
  row: DeadLetterJob | null;
  onClose(): void;
}

function fmtArgs(value: unknown): string {
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
}

// PRD §7.12.9 UI flow #3 — full traceback + args/kwargs in a side drawer.
// The traceback is rendered inside `<pre overflow-x-auto whitespace-pre>` so
// long C-style stack frames don't blow the card width. args/kwargs are
// arbitrary JSON; render via JSON.stringify with indent=2 inside `<code>`
// per the prompt gotcha.
export function DlqDetailDrawer({ row, onClose }: Props) {
  const open = row !== null;

  return (
    <Sheet open={open} onOpenChange={(next) => (!next ? onClose() : undefined)}>
      <SheetContent className="flex w-full flex-col gap-4 sm:max-w-2xl">
        <div className="flex flex-col gap-2 border-b border-border pb-3">
          <SheetTitle>{row?.task_name}</SheetTitle>
          <SheetDescription>
            <span className="inline-flex items-center gap-2">
              <Badge variant="error">{row?.exception_class}</Badge>
              <Badge variant="outline">{row?.retry_status}</Badge>
              {row?.failed_at ? (
                <span
                  className="text-xs text-ink-muted"
                  title={format(parseISO(row.failed_at), 'PPpp')}
                >
                  failed {formatDistanceToNow(parseISO(row.failed_at), { addSuffix: true })}
                </span>
              ) : null}
            </span>
          </SheetDescription>
        </div>

        {row?.exception_message ? (
          <p className="rounded-md border border-error/30 bg-error/5 p-3 text-sm text-error">
            {row.exception_message}
          </p>
        ) : null}

        <section className="flex flex-col gap-2">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-ink-muted">
            Traceback
          </h3>
          {row?.traceback ? (
            <pre
              data-testid="dlq-traceback"
              className="overflow-x-auto whitespace-pre rounded-md border border-border bg-surface-muted p-3 text-xs text-ink-body"
            >
              {row.traceback}
            </pre>
          ) : (
            <p className="text-xs text-ink-muted">No traceback recorded.</p>
          )}
        </section>

        <section className="grid gap-3 md:grid-cols-2">
          <div className="flex flex-col gap-2">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-ink-muted">args</h3>
            <code
              data-testid="dlq-args"
              className="block overflow-x-auto whitespace-pre rounded-md border border-border bg-surface-muted p-3 text-xs text-ink-body"
            >
              {fmtArgs(row?.args ?? [])}
            </code>
          </div>
          <div className="flex flex-col gap-2">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-ink-muted">kwargs</h3>
            <code
              data-testid="dlq-kwargs"
              className="block overflow-x-auto whitespace-pre rounded-md border border-border bg-surface-muted p-3 text-xs text-ink-body"
            >
              {fmtArgs(row?.kwargs ?? {})}
            </code>
          </div>
        </section>

        {row?.task_id ? (
          <p className="text-xs text-ink-muted">
            Original task id: <code className="font-mono">{row.task_id}</code>
          </p>
        ) : null}
      </SheetContent>
    </Sheet>
  );
}
