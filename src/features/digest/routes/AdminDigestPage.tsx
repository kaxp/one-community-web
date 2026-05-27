import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { format, formatDistanceToNow, parseISO } from 'date-fns';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { ErrorState } from '@/components/error-state/ErrorState';
import { EmptyState } from '@/components/empty-state/EmptyState';
import { InlineExecutionButton } from '@/components/execution-panel';
import { useAdminDigest } from '@/features/digest/hooks/use-admin-digest';
import { useDigestSend } from '@/features/digest/hooks/use-digest-send';
import { useDigestPending } from '@/features/digest/hooks/use-digest-pending';
import { useDigestHistory } from '@/features/digest/hooks/use-digest-history';
import { useDigestApprove } from '@/features/digest/hooks/use-digest-approve';
import { useDigestGenerate } from '@/features/digest/hooks/use-digest-generate';
import { DigestPreviewDrawer } from '@/features/digest/components/DigestPreviewDrawer';
import { MyDigestPage } from '@/features/digest/routes/MyDigestPage';
import type { DigestRow, DigestWorkflow } from '@/features/digest/schemas';
import { cn } from '@/lib/cn';
import type { ApiError } from '@/api/errors';
import { PageHeader } from '@/components/layout/PageHeader';

const TABS = ['workflows', 'pending', 'history', 'active'] as const;
type DigestTab = (typeof TABS)[number];

const TAB_LABEL: Record<DigestTab, string> = {
  workflows: 'Workflows',
  pending: 'Pending',
  history: 'History',
  active: 'Active Digest',
};

function isDigestTab(value: string | null): value is DigestTab {
  return (TABS as readonly string[]).includes(value ?? '');
}

function WorkflowsTab() {
  const list = useAdminDigest();
  const send = useDigestSend();
  const generate = useDigestGenerate();

  const sendError = (err: ApiError) => {
    if (err.code === 'conflict') return 'A send is already in progress for this workflow';
    if (err.code === 'not_found') return 'Workflow not found';
    return err.userMessage;
  };

  if (list.isLoading) {
    return (
      <div className="flex flex-col gap-3" data-testid="workflows-loading">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-24 w-full" />
        ))}
      </div>
    );
  }
  if (list.isError) {
    return (
      <ErrorState
        error={list.error}
        onRetry={() => {
          void list.refetch();
        }}
      />
    );
  }
  const workflows = list.data ?? [];
  if (workflows.length === 0) {
    return <EmptyState title="No digest workflows" description="None registered yet." />;
  }
  return (
    <ul className="flex flex-col gap-3" data-testid="workflows-list">
      {workflows.map((wf: DigestWorkflow) => {
        const segment = wf.target_roles[0] ?? wf.workflow_name;
        return (
          <li key={wf.workflow_name}>
            <Card>
              <CardContent className="flex flex-col gap-3 p-5 sm:flex-row sm:items-start sm:justify-between">
                <div className="flex flex-col gap-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-semibold text-ink-heading">{wf.workflow_name}</span>
                    <Badge variant={wf.status === 'active' ? 'success' : 'secondary'}>
                      {wf.status}
                    </Badge>
                    {wf.target_roles.map((r) => (
                      <Badge key={r} variant="outline">
                        {r}
                      </Badge>
                    ))}
                  </div>
                  <p className="text-xs text-ink-muted">{wf.schedule}</p>
                  {wf.last_send ? (
                    <p
                      className="text-xs text-ink-muted"
                      title={format(parseISO(wf.last_send.sent_at), 'PPpp')}
                    >
                      Last sent{' '}
                      {formatDistanceToNow(parseISO(wf.last_send.sent_at), { addSuffix: true })} ·{' '}
                      {wf.last_send.message_count} messages
                    </p>
                  ) : (
                    <p className="text-xs text-ink-muted">Never sent.</p>
                  )}
                </div>
                <div className="flex flex-wrap items-center gap-2 self-start">
                  <InlineExecutionButton
                    size="sm"
                    variant="outline"
                    mutation={generate}
                    input={{ segment }}
                    onSuccessToast={(data) =>
                      `Generated ${data.generated_count} drafts for ${data.segment}`
                    }
                    onErrorToast={(err) => err.userMessage}
                    data-testid={`generate-${wf.workflow_name}`}
                  >
                    Generate for {segment}
                  </InlineExecutionButton>
                  <InlineExecutionButton
                    size="sm"
                    mutation={send}
                    input={{ workflow_name: wf.workflow_name }}
                    onSuccessToast={(data) =>
                      `Triggered — ${data.message_count ?? '0'} messages queued`
                    }
                    onErrorToast={sendError}
                    data-testid={`send-${wf.workflow_name}`}
                  >
                    Send Now
                  </InlineExecutionButton>
                </div>
              </CardContent>
            </Card>
          </li>
        );
      })}
    </ul>
  );
}

function PendingTab() {
  const list = useDigestPending();
  const approve = useDigestApprove();
  const [previewing, setPreviewing] = useState<DigestRow | null>(null);

  const approveError = (err: ApiError) => {
    if (err.code === 'conflict') return 'Already approved or sent — refreshing';
    if (err.code === 'not_found') return 'Digest no longer exists';
    return err.userMessage;
  };

  if (list.isLoading) {
    return (
      <div className="flex flex-col gap-3" data-testid="pending-loading">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-24 w-full" />
        ))}
      </div>
    );
  }
  if (list.isError) {
    return (
      <ErrorState
        error={list.error}
        onRetry={() => {
          void list.refetch();
        }}
      />
    );
  }
  const items = list.data ?? [];
  if (items.length === 0) {
    return (
      <EmptyState
        title="No pending digests"
        description="Trigger a generate from the Workflows tab when you're ready to draft."
      />
    );
  }
  return (
    <>
      <ul className="flex flex-col gap-3" data-testid="pending-list">
        {items.map((row) => (
          <li key={row.id}>
            <Card>
              <CardContent className="flex flex-col gap-3 p-5 sm:flex-row sm:items-start sm:justify-between">
                <div className="flex min-w-0 flex-1 flex-col gap-1">
                  <p className="truncate font-semibold text-ink-heading">{row.content.subject}</p>
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="secondary">{row.digest_type}</Badge>
                    {row.content.segment ? (
                      <Badge variant="outline">{row.content.segment}</Badge>
                    ) : null}
                    {(row.content.interest_tags ?? []).map((t) => (
                      <Badge key={t} variant="outline">
                        {t}
                      </Badge>
                    ))}
                  </div>
                  {row.content.plain ? (
                    <p className="line-clamp-2 text-xs text-ink-muted">{row.content.plain}</p>
                  ) : null}
                </div>
                <div className="flex flex-wrap items-center gap-2 self-start">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setPreviewing(row)}
                    data-testid={`preview-${row.id}`}
                  >
                    Preview
                  </Button>
                  <InlineExecutionButton
                    size="sm"
                    mutation={approve}
                    input={{ digest_id: row.id }}
                    onSuccessToast={() => 'Approved — delivery queued'}
                    onErrorToast={approveError}
                    data-testid={`approve-${row.id}`}
                  >
                    Approve & Send
                  </InlineExecutionButton>
                </div>
              </CardContent>
            </Card>
          </li>
        ))}
      </ul>
      <DigestPreviewDrawer row={previewing} onClose={() => setPreviewing(null)} />
    </>
  );
}

function HistoryTab() {
  const list = useDigestHistory({ limit: 50 });
  const [expanded, setExpanded] = useState<DigestRow | null>(null);

  if (list.isLoading) {
    return (
      <div className="flex flex-col gap-3" data-testid="history-loading">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-16 w-full" />
        ))}
      </div>
    );
  }
  if (list.isError) {
    return (
      <ErrorState
        error={list.error}
        onRetry={() => {
          void list.refetch();
        }}
      />
    );
  }
  const items = list.data ?? [];
  if (items.length === 0) {
    return <EmptyState title="No sent digests yet" description="Sent rows will appear here." />;
  }
  return (
    <>
      <ul className="flex flex-col gap-2" data-testid="history-list">
        {items.map((row) => (
          <li key={row.id}>
            <Card>
              <CardContent className="flex items-center justify-between gap-3 p-4">
                <div className="flex min-w-0 flex-col gap-1">
                  <p className="truncate text-sm font-medium text-ink-heading">
                    {row.content.subject}
                  </p>
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="secondary">{row.digest_type}</Badge>
                    {row.sent_at ? (
                      <span
                        className="text-xs text-ink-muted"
                        title={format(parseISO(row.sent_at), 'PPpp')}
                      >
                        sent {formatDistanceToNow(parseISO(row.sent_at), { addSuffix: true })}
                      </span>
                    ) : null}
                  </div>
                </div>
                <Button size="sm" variant="ghost" onClick={() => setExpanded(row)}>
                  Preview
                </Button>
              </CardContent>
            </Card>
          </li>
        ))}
      </ul>
      <DigestPreviewDrawer row={expanded} onClose={() => setExpanded(null)} />
    </>
  );
}

// PRD §7.12.3 + §7.12.4 + §7.13.* — admin digest console. Three URL tabs:
// Workflows / Pending / History. Tab state persists in `?tab=`.
export function AdminDigestPage() {
  const [params, setParams] = useSearchParams();
  const tabParam = params.get('tab');
  const tab: DigestTab = isDigestTab(tabParam) ? tabParam : 'workflows';

  const setTab = (next: DigestTab) => {
    const sp = new URLSearchParams(params);
    sp.set('tab', next);
    setParams(sp, { replace: true });
  };

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Digest console"
        subtitle="Manage workflows, review AI-drafted digests, and audit past sends."
      />

      <nav role="tablist" aria-label="Digest section" className="flex flex-wrap gap-2">
        {TABS.map((t) => {
          const isActive = t === tab;
          return (
            <button
              key={t}
              role="tab"
              aria-selected={isActive}
              type="button"
              onClick={() => setTab(t)}
              className={cn(
                'min-h-9 rounded-full border px-3 py-1 text-sm font-medium transition-colors',
                isActive
                  ? 'border-brand bg-brand/10 text-brand'
                  : 'border-border bg-surface text-ink-body hover:bg-surface-muted',
              )}
              data-testid={`tab-${t}`}
            >
              {TAB_LABEL[t]}
            </button>
          );
        })}
      </nav>

      {tab === 'active' ? (
        <MyDigestPage />
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>{TAB_LABEL[tab]}</CardTitle>
            <CardDescription>
              {tab === 'workflows'
                ? 'Registered digest workflows — generate drafts or trigger an immediate send.'
                : tab === 'pending'
                  ? 'AI-drafted digests waiting for admin approval. Sandboxed preview before send.'
                  : 'Read-only audit of past sent digests (last 50).'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {tab === 'workflows' ? <WorkflowsTab /> : null}
            {tab === 'pending' ? <PendingTab /> : null}
            {tab === 'history' ? <HistoryTab /> : null}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
