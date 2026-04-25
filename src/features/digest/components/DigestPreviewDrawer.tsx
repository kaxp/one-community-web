import { Sheet, SheetContent, SheetDescription, SheetTitle } from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import type { DigestRow } from '@/features/digest/schemas';

interface Props {
  row: DigestRow | null;
  onClose(): void;
}

// PRD §7.13.3 + §13 G11-style discipline — render the digest body in a
// sandboxed iframe via `srcDoc`. Never `dangerouslySetInnerHTML`. Only
// `allow-same-origin` is set; no scripts, no top-navigation, no popups.
export function DigestPreviewDrawer({ row, onClose }: Props) {
  const open = row !== null;
  const html = row?.content.html ?? '';

  return (
    <Sheet open={open} onOpenChange={(next) => (!next ? onClose() : undefined)}>
      <SheetContent className="flex w-full flex-col gap-4 sm:max-w-2xl">
        <div className="flex flex-col gap-2 border-b border-border pb-3">
          <SheetTitle>{row?.content.subject ?? 'Digest preview'}</SheetTitle>
          <SheetDescription>
            <span className="inline-flex items-center gap-2">
              <Badge variant="secondary">{row?.digest_type}</Badge>
              {row?.content.segment ? <Badge variant="outline">{row.content.segment}</Badge> : null}
            </span>
          </SheetDescription>
        </div>
        {html ? (
          <iframe
            data-testid="digest-preview-iframe"
            title={`digest-${row?.id ?? 'preview'}`}
            sandbox="allow-same-origin"
            srcDoc={html}
            className="h-full min-h-[60vh] w-full rounded-md border border-border bg-surface"
          />
        ) : (
          <p className="text-sm text-ink-muted">
            No HTML body available for this digest. Plain-text fallback:
          </p>
        )}
        {!html && row?.content.plain ? (
          <pre className="whitespace-pre-wrap rounded-md border border-border bg-surface-muted p-3 text-xs text-ink-body">
            {row.content.plain}
          </pre>
        ) : null}
      </SheetContent>
    </Sheet>
  );
}
