import { Link } from 'react-router-dom';
import { ArrowRight, Download, FileText, Folder, Search as SearchIcon, Upload } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { EmptyState } from '@/components/empty-state/EmptyState';
import { cn } from '@/lib/cn';
import { PageHeader } from '@/components/layout/PageHeader';

// PRD §13 G3 — `/documents` is gated until backend ships POST /documents/upload
// + GET /documents listing. Until then, this page renders the full UI shell
// with every interactive element disabled, plus a clear "blocker summary"
// panel at the bottom so an admin can see exactly what needs to ship before
// flipping `VITE_DOCUMENTS_UPLOAD_ENABLED=true`.

const FILTER_CHIPS = [
  { label: 'All' },
  { label: 'Pitch decks' },
  { label: 'Term sheets' },
  { label: 'MIS reports' },
  { label: 'Quarterly' },
  { label: 'Other' },
];

export function DocumentsPage() {
  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Documents"
        subtitle="A shared vault for pitch decks, term sheets, and portfolio reporting. Backend ships in Phase 4 — for now, please continue sharing files through the existing channel."
      />

      <div
        role="status"
        className="flex items-start gap-3 rounded-lg border border-warning/30 bg-warning/5 p-4 text-sm text-warning"
      >
        <Upload className="mt-0.5 h-4 w-4 flex-none" aria-hidden />
        <div className="flex flex-col gap-1">
          <p className="font-semibold text-ink-heading">Phase 4 — coming soon</p>
          <p className="text-ink-body">
            Uploads go live with `POST /documents/upload`. Until then the layout below previews what
            the page will look like — every action is disabled.
          </p>
        </div>
      </div>

      <Card>
        <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div className="flex flex-col gap-1">
            <CardTitle>Browse</CardTitle>
            <CardDescription>Filter by type or search by file name.</CardDescription>
          </div>
          <Button
            disabled
            title="Upload activates in Phase 4 (PRD §13 G3)"
            data-testid="upload-disabled"
          >
            <Upload className="h-4 w-4" aria-hidden />
            <span>Upload document</span>
          </Button>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="relative flex-1">
              <SearchIcon
                className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-muted"
                aria-hidden
              />
              <Input
                disabled
                placeholder="Search documents (Phase 4)"
                className="pl-9"
                aria-label="Search documents"
                title="Search activates in Phase 4 (PRD §13 G3)"
              />
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {FILTER_CHIPS.map((chip, idx) => (
              <button
                key={chip.label}
                type="button"
                disabled
                aria-disabled
                className={cn(
                  'min-h-9 cursor-not-allowed rounded-full border px-3 py-1 text-sm font-medium transition-colors',
                  idx === 0
                    ? 'border-brand bg-brand/10 text-brand opacity-60'
                    : 'border-border bg-surface text-ink-body opacity-60',
                )}
                title="Filters activate in Phase 4 (PRD §13 G3)"
              >
                {chip.label}
              </button>
            ))}
          </div>

          <EmptyState
            icon={Folder}
            title="No documents yet"
            description="When the vault opens, your team's pitch decks, term sheets, and portfolio reports will appear here."
            action={
              <Button variant="outline" asChild>
                <Link to="/pitch">
                  <FileText className="h-4 w-4" aria-hidden />
                  <span>Share via the pitch page (works today)</span>
                  <ArrowRight className="h-4 w-4" aria-hidden />
                </Link>
              </Button>
            }
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>What needs to ship before this goes live</CardTitle>
          <CardDescription>
            Tracked in <code className="font-mono text-xs">frontend_prd.md §13 G3</code>. Frontend
            is unblocked on every other route — only this page waits on backend.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4 text-sm text-ink-body">
          <section className="flex flex-col gap-2">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-ink-muted">
              Backend blockers
            </h3>
            <ul className="ml-4 list-disc space-y-1">
              <li>
                <span className="font-mono text-xs">POST /documents/upload</span> — multipart upload
                endpoint accepting <code className="text-xs">file</code>,{' '}
                <code className="text-xs">category</code>, optional{' '}
                <code className="text-xs">linked_startup_id</code>; returns the document row.
              </li>
              <li>
                <span className="font-mono text-xs">GET /documents</span> — cursor-paginated list
                with optional <code className="text-xs">category</code> +{' '}
                <code className="text-xs">linked_startup_id</code> filters.
              </li>
              <li>
                <span className="font-mono text-xs">GET /documents/&#123;id&#125;/download</span> —
                signed URL or proxied stream.
              </li>
              <li>
                <span className="font-mono text-xs">DELETE /documents/&#123;id&#125;</span> —
                owner-or-admin gated; soft-delete acceptable.
              </li>
              <li>Storage: S3-compatible bucket + virus scan path (Phase-4 security ask).</li>
            </ul>
          </section>

          <section className="flex flex-col gap-2">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-ink-muted">
              Frontend follow-up (when backend lands)
            </h3>
            <ul className="ml-4 list-disc space-y-1">
              <li>
                Flip <code className="text-xs">VITE_DOCUMENTS_UPLOAD_ENABLED=true</code> in
                <code className="text-xs"> .env.development</code>.
              </li>
              <li>
                Wire <code className="text-xs">postDocumentUpload</code> +{' '}
                <code className="text-xs">listDocuments</code> in{' '}
                <code className="text-xs">src/api/endpoints.ts</code> with Zod schemas mirroring the
                contract.
              </li>
              <li>
                Replace this page&apos;s disabled toolbar with the live versions:{' '}
                <code className="text-xs">&lt;FileDropzone&gt;</code> for upload, search-bar
                debounce, filter chips wired to URL params.
              </li>
              <li>Remove this blocker card once docs land.</li>
            </ul>
          </section>

          <section className="flex flex-col gap-2">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-ink-muted">Status</h3>
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="warning">Phase 4 — blocked on backend</Badge>
              <Badge variant="outline">No frontend interim path</Badge>
            </div>
            <p className="text-xs text-ink-muted">
              Workaround for users today: paste a Google Drive deck URL on{' '}
              <Link to="/pitch" className="text-brand hover:underline">
                /pitch
              </Link>{' '}
              (PRD §7.3.3 already wires that path). Quarterly reports flow through{' '}
              <Link to="/admin/quarterly-reports" className="text-brand hover:underline">
                /admin/quarterly-reports
              </Link>{' '}
              with Drive links.
            </p>
          </section>

          <div className="flex justify-start pt-2">
            <Button variant="outline" asChild>
              <Link to="/dashboard">
                <ArrowRight className="h-4 w-4 rotate-180" aria-hidden />
                <span>Back to dashboard</span>
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Until docs ship, you can also…</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-2 text-sm text-ink-body">
          <p>
            <Download className="mr-1 inline h-3.5 w-3.5 text-ink-muted" aria-hidden />
            Download startup decks via the URL on each pitch page.
          </p>
          <p>
            <FileText className="mr-1 inline h-3.5 w-3.5 text-ink-muted" aria-hidden />
            Read quarterly reports straight from the Drive link in the admin console.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
