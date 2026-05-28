import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { CheckCircle2, Loader2, XCircle } from 'lucide-react';
import { toast } from 'sonner';
import { z } from 'zod';
import { zUUID, zISODateTime } from '@/lib/zod-helpers';
import { apiClient } from '@/api/client';
import type { ApiEnvelope } from '@/types/api';
import type { ApiError } from '@/api/errors';
import { cn } from '@/lib/cn';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { RoleBadge } from '@/components/role-badge';
import { ErrorState } from '@/components/error-state/ErrorState';
import { PageHeader } from '@/components/layout/PageHeader';

// ── Schemas ──────────────────────────────────────────────────────────────────

const zReferralItem = z.object({
  scan_id: zUUID,
  referrer_name: z.string().nullable(),
  referrer_role: z.string().nullable(),
  contact_name: z.string().nullable(),
  contact_phone: z.string().nullable(),
  contact_email: z.string().nullable(),
  contact_role: z.string().nullable(),
  admin_note: z.string().nullable().optional(),
  created_at: z.string(),
});
type ReferralItem = z.infer<typeof zReferralItem>;

const zReferralListResponse = z.object({ items: z.array(zReferralItem) });
const zReferralActionResponse = z.object({
  scan_id: zUUID,
  status: z.string(),
  user_id: zUUID.nullable(),
});

const zReferralHistoryItem = z.object({
  scan_id: zUUID,
  referrer_name: z.string().nullable(),
  referrer_role: z.string().nullable(),
  contact_name: z.string().nullable(),
  contact_phone: z.string().nullable(),
  contact_email: z.string().nullable(),
  contact_role: z.string().nullable(),
  admin_note: z.string().nullable().optional(),
  referral_status: z.string(),
  created_at: zISODateTime,
});
type ReferralHistoryItem = z.infer<typeof zReferralHistoryItem>;
const zReferralHistoryResponse = z.object({ items: z.array(zReferralHistoryItem) });

// ── API calls ─────────────────────────────────────────────────────────────────

async function getReferrals(): Promise<ReferralItem[]> {
  const resp = await apiClient.get<ApiEnvelope<{ items: ReferralItem[] }>>('/admin/referrals');
  const data = zReferralListResponse.parse(resp.data.data);
  return data.items;
}

async function approveReferral(scanId: string) {
  const resp = await apiClient.post<ApiEnvelope<unknown>>(`/admin/referrals/${scanId}/approve`);
  return zReferralActionResponse.parse(resp.data.data);
}

async function rejectReferral(scanId: string, note: string | undefined) {
  const resp = await apiClient.post<ApiEnvelope<unknown>>(`/admin/referrals/${scanId}/reject`, {
    note: note || null,
  });
  return zReferralActionResponse.parse(resp.data.data);
}

async function getReferralHistory(): Promise<ReferralHistoryItem[]> {
  const resp = await apiClient.get<ApiEnvelope<{ items: ReferralHistoryItem[] }>>(
    '/admin/referrals/history',
  );
  const data = zReferralHistoryResponse.parse(resp.data.data);
  return data.items;
}

const QK_REFERRALS = ['admin', 'referrals'] as const;
const QK_REFERRAL_HISTORY = ['admin', 'referrals', 'history'] as const;

// ── Phase 4 menu Phase C2 follow-up (2026-05-28): WhatsApp onboarding ──────

const zOnboardingItem = z.object({
  id: zUUID,
  source: z.enum(['public_signup', 'wa_referral']),
  source_channel: z.string().nullable().optional(),
  submitter_name: z.string().nullable().optional(),
  submitter_role: z.string().nullable().optional(),
  contact_name: z.string().nullable(),
  contact_phone: z.string().nullable(),
  contact_email: z.string().nullable(),
  contact_role_or_category: z.string().nullable(),
  organisation: z.string().nullable(),
  linkedin_url: z.string().nullable(),
  designation: z.string().nullable().optional(),
  city: z.string().nullable().optional(),
  website: z.string().nullable().optional(),
  address: z.string().nullable().optional(),
  message: z.string().nullable(),
  status: z.string(),
  created_at: z.string(),
  review_note: z.string().nullable().optional(),
});
type OnboardingItem = z.infer<typeof zOnboardingItem>;
const zOnboardingResponse = z.object({ items: z.array(zOnboardingItem) });

const zOnboardingActionResponse = z.object({
  row_id: z.string(),
  source: z.enum(['public_signup', 'wa_referral']),
  status: z.string(),
  user_id: z.string().nullable().optional(),
  role: z.string().nullable().optional(),
});

async function getOnboarding(view: 'pending' | 'history'): Promise<OnboardingItem[]> {
  const resp = await apiClient.get<ApiEnvelope<{ items: OnboardingItem[] }>>(
    `/admin/onboarding/whatsapp?view=${view}`,
  );
  return zOnboardingResponse.parse(resp.data.data).items;
}

async function approveOnboarding(source: OnboardingItem['source'], rowId: string) {
  const resp = await apiClient.post<ApiEnvelope<unknown>>(
    `/admin/onboarding/whatsapp/${source}/${rowId}/approve`,
  );
  return zOnboardingActionResponse.parse(resp.data.data);
}

async function rejectOnboarding(
  source: OnboardingItem['source'],
  rowId: string,
  note: string | undefined,
) {
  const resp = await apiClient.post<ApiEnvelope<unknown>>(
    `/admin/onboarding/whatsapp/${source}/${rowId}/reject`,
    { note: note || null },
  );
  return zOnboardingActionResponse.parse(resp.data.data);
}

const QK_ONBOARDING_PENDING = ['admin', 'onboarding-wa', 'pending'] as const;
const QK_ONBOARDING_HISTORY = ['admin', 'onboarding-wa', 'history'] as const;

// ── RejectDialog ──────────────────────────────────────────────────────────────

function RejectDialog({
  scanId,
  open,
  onOpenChange,
  onDone,
}: {
  scanId: string;
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onDone: () => void;
}) {
  const [note, setNote] = useState('');
  const qc = useQueryClient();

  const reject = useMutation<unknown, ApiError, { scanId: string; note: string | undefined }>({
    mutationFn: ({ scanId: id, note: n }) => rejectReferral(id, n),
    onSuccess: () => {
      toast.success('Referral rejected.');
      void qc.invalidateQueries({ queryKey: QK_REFERRALS });
      onOpenChange(false);
      setNote('');
      onDone();
    },
    onError: (e) => toast.error(e.userMessage),
  });

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        onOpenChange(v);
        if (!v) setNote('');
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Reject referral</DialogTitle>
          <DialogDescription>
            Optionally add a note explaining the rejection. The person who submitted this referral
            will see this message.
          </DialogDescription>
        </DialogHeader>
        <textarea
          className="min-h-[100px] w-full resize-none rounded-md border border-border bg-surface p-3 text-sm text-ink-body placeholder:text-ink-muted focus:outline-none focus:ring-2 focus:ring-brand focus:ring-offset-1"
          placeholder="Reason for rejection (optional)"
          rows={4}
          value={note}
          onChange={(e) => setNote(e.target.value)}
        />
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => {
              onOpenChange(false);
              setNote('');
            }}
          >
            Cancel
          </Button>
          <Button
            variant="destructive"
            disabled={reject.isPending}
            onClick={() => reject.mutate({ scanId, note: note.trim() || undefined })}
          >
            {reject.isPending ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : null}
            Reject
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── ReferralRow ───────────────────────────────────────────────────────────────

function ReferralRow({ item, onAction }: { item: ReferralItem; onAction: () => void }) {
  const qc = useQueryClient();
  const [rejectOpen, setRejectOpen] = useState(false);

  const approve = useMutation<unknown, ApiError, string>({
    mutationFn: approveReferral,
    onSuccess: () => {
      toast.success('Referral approved — user created.');
      void qc.invalidateQueries({ queryKey: QK_REFERRALS });
      onAction();
    },
    onError: (e) => toast.error(e.userMessage),
  });

  return (
    <>
      <div className="flex flex-col gap-3 rounded-lg border border-border bg-surface p-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex flex-col gap-1">
          <div className="flex flex-wrap items-center gap-2 text-sm font-medium text-ink-heading">
            <span>{item.contact_name ?? '—'}</span>
            {item.contact_role ? (
              <span className="rounded-full bg-surface-muted px-2 py-0.5 text-xs text-ink-muted capitalize">
                {item.contact_role.replace(/_/g, ' ')}
              </span>
            ) : null}
          </div>
          <div className="flex flex-wrap gap-x-4 gap-y-0.5 text-xs text-ink-muted">
            {item.contact_phone ? <span>{item.contact_phone}</span> : null}
            {item.contact_email ? <span>{item.contact_email}</span> : null}
          </div>
          <div className="mt-1 flex flex-wrap items-center gap-1.5 text-xs text-ink-muted">
            <span>Referred by</span>
            <span className="font-medium text-ink-body">{item.referrer_name ?? 'Unknown'}</span>
            {item.referrer_role ? <RoleBadge role={item.referrer_role as never} /> : null}
            <span>·</span>
            <span>{new Date(item.created_at).toLocaleDateString()}</span>
          </div>
        </div>

        <div className="flex shrink-0 gap-2">
          <Button
            size="sm"
            variant="outline"
            disabled={approve.isPending}
            onClick={() => setRejectOpen(true)}
            className="text-error hover:border-error hover:text-error"
          >
            Reject
          </Button>
          <Button
            size="sm"
            disabled={approve.isPending}
            onClick={() => approve.mutate(item.scan_id)}
          >
            {approve.isPending ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <CheckCircle2 className="h-3.5 w-3.5" />
            )}
            Approve
          </Button>
        </div>
      </div>

      <RejectDialog
        scanId={item.scan_id}
        open={rejectOpen}
        onOpenChange={setRejectOpen}
        onDone={onAction}
      />
    </>
  );
}

// ── History row ───────────────────────────────────────────────────────────────

function HistoryRow({ item }: { item: ReferralHistoryItem }) {
  const approved = item.referral_status === 'approved';
  return (
    <div className="flex flex-col gap-2 rounded-lg border border-border bg-surface p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="flex flex-col gap-1">
          <div className="flex flex-wrap items-center gap-2 text-sm font-medium text-ink-heading">
            <span>{item.contact_name ?? '—'}</span>
            {item.contact_role ? (
              <span className="rounded-full bg-surface-muted px-2 py-0.5 text-xs text-ink-muted capitalize">
                {item.contact_role.replace(/_/g, ' ')}
              </span>
            ) : null}
          </div>
          <div className="flex flex-wrap gap-x-4 gap-y-0.5 text-xs text-ink-muted">
            {item.contact_phone ? <span>{item.contact_phone}</span> : null}
            {item.contact_email ? <span>{item.contact_email}</span> : null}
          </div>
          <div className="mt-0.5 flex flex-wrap items-center gap-1.5 text-xs text-ink-muted">
            <span>Referred by</span>
            <span className="font-medium text-ink-body">{item.referrer_name ?? 'Unknown'}</span>
            {item.referrer_role ? <RoleBadge role={item.referrer_role as never} /> : null}
            <span>·</span>
            <span>{new Date(item.created_at).toLocaleDateString()}</span>
          </div>
        </div>
        <span
          className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium ${
            approved
              ? 'border-success/30 bg-success/10 text-success'
              : 'border-error/30 bg-error/10 text-error'
          }`}
        >
          {approved ? (
            <CheckCircle2 className="h-3.5 w-3.5" aria-hidden />
          ) : (
            <XCircle className="h-3.5 w-3.5" aria-hidden />
          )}
          {approved ? 'Approved' : 'Rejected'}
        </span>
      </div>
      {!approved && item.admin_note ? (
        <p className="rounded-md border border-error/20 bg-error/5 px-3 py-2 text-xs text-error">
          <span className="font-medium">Note: </span>
          {item.admin_note}
        </p>
      ) : null}
    </div>
  );
}

// ── Phase C2 follow-up (2026-05-28): WhatsApp onboarding rows ────────────────

function SourceChip({ item }: { item: OnboardingItem }) {
  const label =
    item.source === 'wa_referral'
      ? 'Refer Flow'
      : item.source_channel === 'wa_join_community'
        ? 'Join Community Flow'
        : item.source_channel === 'web_public_form'
          ? 'Public web form'
          : 'WhatsApp';
  return (
    <span className="rounded-full bg-surface-muted px-2 py-0.5 text-xs text-ink-muted">
      {label}
    </span>
  );
}

function OnboardingRejectDialog({
  source,
  rowId,
  open,
  onOpenChange,
  onDone,
}: {
  source: OnboardingItem['source'];
  rowId: string;
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onDone: () => void;
}) {
  const [note, setNote] = useState('');
  const qc = useQueryClient();

  const reject = useMutation<
    unknown,
    ApiError,
    { source: OnboardingItem['source']; rowId: string; note: string | undefined }
  >({
    mutationFn: ({ source: s, rowId: id, note: n }) => rejectOnboarding(s, id, n),
    onSuccess: () => {
      toast.success('Submission rejected.');
      void qc.invalidateQueries({ queryKey: QK_ONBOARDING_PENDING });
      void qc.invalidateQueries({ queryKey: QK_ONBOARDING_HISTORY });
      onOpenChange(false);
      setNote('');
      onDone();
    },
    onError: (e) => toast.error(e.userMessage),
  });

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        onOpenChange(v);
        if (!v) setNote('');
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Reject submission</DialogTitle>
          <DialogDescription>
            Optionally add a note for the audit log. The submitter is not contacted automatically.
          </DialogDescription>
        </DialogHeader>
        <textarea
          className="min-h-[100px] w-full resize-none rounded-md border border-border bg-surface p-3 text-sm text-ink-body placeholder:text-ink-muted focus:outline-none focus:ring-2 focus:ring-brand focus:ring-offset-1"
          placeholder="Reason (optional)"
          rows={4}
          value={note}
          onChange={(e) => setNote(e.target.value)}
        />
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => {
              onOpenChange(false);
              setNote('');
            }}
          >
            Cancel
          </Button>
          <Button
            variant="destructive"
            disabled={reject.isPending}
            onClick={() => reject.mutate({ source, rowId, note: note.trim() || undefined })}
          >
            {reject.isPending ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : null}
            Reject
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function OnboardingPendingRow({ item, onAction }: { item: OnboardingItem; onAction: () => void }) {
  const qc = useQueryClient();
  const [rejectOpen, setRejectOpen] = useState(false);

  const approve = useMutation<unknown, ApiError, void>({
    mutationFn: () => approveOnboarding(item.source, item.id),
    onSuccess: (data) => {
      const ok = zOnboardingActionResponse.safeParse(data);
      if (ok.success && ok.data.user_id) {
        toast.success('Approved — user created.');
      } else {
        toast.success('Submission approved.');
      }
      void qc.invalidateQueries({ queryKey: QK_ONBOARDING_PENDING });
      void qc.invalidateQueries({ queryKey: QK_ONBOARDING_HISTORY });
      onAction();
    },
    onError: (e) => toast.error(e.userMessage),
  });

  return (
    <>
      <div
        className="flex flex-col gap-3 rounded-lg border border-border bg-surface p-4 sm:flex-row sm:items-start sm:justify-between"
        data-testid={`wa-onboarding-row-${item.id}`}
      >
        <div className="flex flex-col gap-1">
          <div className="flex flex-wrap items-center gap-2 text-sm font-medium text-ink-heading">
            <span>{item.contact_name ?? '—'}</span>
            {item.contact_role_or_category ? (
              <span className="rounded-full bg-surface-muted px-2 py-0.5 text-xs text-ink-muted capitalize">
                {item.contact_role_or_category.replace(/_/g, ' ')}
              </span>
            ) : null}
            <SourceChip item={item} />
          </div>
          <div className="flex flex-wrap gap-x-4 gap-y-0.5 text-xs text-ink-muted">
            {item.contact_phone ? <span>{item.contact_phone}</span> : null}
            {item.contact_email ? <span>{item.contact_email}</span> : null}
            {item.organisation ? <span>{item.organisation}</span> : null}
            {item.city ? <span>{item.city}</span> : null}
          </div>
          {item.submitter_name ? (
            <div className="mt-1 flex flex-wrap items-center gap-1.5 text-xs text-ink-muted">
              <span>Referred by</span>
              <span className="font-medium text-ink-body">{item.submitter_name}</span>
              <span>·</span>
              <span>{new Date(item.created_at).toLocaleDateString()}</span>
            </div>
          ) : (
            <div className="mt-1 text-xs text-ink-muted">
              <span>{new Date(item.created_at).toLocaleDateString()}</span>
            </div>
          )}
          {item.message ? (
            <p className="mt-1 max-w-prose rounded-md bg-surface-muted/50 p-2 text-xs text-ink-body">
              {item.message}
            </p>
          ) : null}
        </div>

        <div className="flex shrink-0 gap-2">
          <Button
            size="sm"
            variant="outline"
            disabled={approve.isPending}
            onClick={() => setRejectOpen(true)}
            className="text-error hover:border-error hover:text-error"
          >
            Reject
          </Button>
          <Button
            size="sm"
            disabled={approve.isPending}
            onClick={() => approve.mutate()}
            data-testid={`wa-onboarding-approve-${item.id}`}
          >
            {approve.isPending ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <CheckCircle2 className="h-3.5 w-3.5" />
            )}
            Approve
          </Button>
        </div>
      </div>

      <OnboardingRejectDialog
        source={item.source}
        rowId={item.id}
        open={rejectOpen}
        onOpenChange={setRejectOpen}
        onDone={onAction}
      />
    </>
  );
}

function OnboardingHistoryRow({ item }: { item: OnboardingItem }) {
  // Approved sources: public_signups → 'approved', wa_referrals → 'converted'.
  const isApproved = item.status === 'approved' || item.status === 'converted';
  return (
    <div className="flex flex-col gap-2 rounded-lg border border-border bg-surface p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="flex flex-col gap-1">
          <div className="flex flex-wrap items-center gap-2 text-sm font-medium text-ink-heading">
            <span>{item.contact_name ?? '—'}</span>
            {item.contact_role_or_category ? (
              <span className="rounded-full bg-surface-muted px-2 py-0.5 text-xs text-ink-muted capitalize">
                {item.contact_role_or_category.replace(/_/g, ' ')}
              </span>
            ) : null}
            <SourceChip item={item} />
          </div>
          <div className="flex flex-wrap gap-x-4 gap-y-0.5 text-xs text-ink-muted">
            {item.contact_phone ? <span>{item.contact_phone}</span> : null}
            {item.contact_email ? <span>{item.contact_email}</span> : null}
          </div>
          <div className="mt-0.5 text-xs text-ink-muted">
            {new Date(item.created_at).toLocaleDateString()}
          </div>
        </div>
        <span
          className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium capitalize ${
            isApproved
              ? 'border-success/30 bg-success/10 text-success'
              : 'border-error/30 bg-error/10 text-error'
          }`}
        >
          {isApproved ? (
            <CheckCircle2 className="h-3.5 w-3.5" aria-hidden />
          ) : (
            <XCircle className="h-3.5 w-3.5" aria-hidden />
          )}
          {item.status}
        </span>
      </div>
      {!isApproved && item.review_note ? (
        <p className="rounded-md border border-error/20 bg-error/5 px-3 py-2 text-xs text-error">
          <span className="font-medium">Note: </span>
          {item.review_note}
        </p>
      ) : null}
    </div>
  );
}

function WhatsAppOnboardingTab() {
  const pending = useQuery<OnboardingItem[], ApiError>({
    queryKey: QK_ONBOARDING_PENDING,
    queryFn: () => getOnboarding('pending'),
  });
  const history = useQuery<OnboardingItem[], ApiError>({
    queryKey: QK_ONBOARDING_HISTORY,
    queryFn: () => getOnboarding('history'),
  });

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Pending WhatsApp onboarding</CardTitle>
          <CardDescription>
            {pending.isLoading
              ? 'Loading…'
              : `${pending.data?.length ?? 0} pending — submissions via the Join Community Flow, the Refer Flow, and the public /join form.`}
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          {pending.isLoading ? (
            <div className="flex items-center gap-3 py-4 text-sm text-ink-muted">
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
              Loading submissions…
            </div>
          ) : pending.isError ? (
            <ErrorState error={pending.error} onRetry={() => void pending.refetch()} />
          ) : !pending.data?.length ? (
            <p className="py-4 text-center text-sm text-ink-muted">No pending submissions.</p>
          ) : (
            pending.data.map((item) => (
              <OnboardingPendingRow
                key={`${item.source}-${item.id}`}
                item={item}
                onAction={() => {
                  void pending.refetch();
                  void history.refetch();
                }}
              />
            ))
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>WhatsApp onboarding history</CardTitle>
          <CardDescription>Previously approved and rejected WA submissions.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          {history.isLoading ? (
            <div className="flex items-center gap-3 py-4 text-sm text-ink-muted">
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
              Loading history…
            </div>
          ) : history.isError ? (
            <ErrorState error={history.error} onRetry={() => void history.refetch()} />
          ) : !history.data?.length ? (
            <p className="py-4 text-center text-sm text-ink-muted">No history yet.</p>
          ) : (
            history.data.map((item) => (
              <OnboardingHistoryRow key={`${item.source}-${item.id}`} item={item} />
            ))
          )}
        </CardContent>
      </Card>
    </>
  );
}

// Tab switcher constants
const REFERRAL_TABS = ['card-scans', 'whatsapp'] as const;
type ReferralTab = (typeof REFERRAL_TABS)[number];
const REFERRAL_TAB_LABEL: Record<ReferralTab, string> = {
  'card-scans': 'Card scans',
  whatsapp: 'WhatsApp onboarding',
};
function isReferralTab(value: string | null): value is ReferralTab {
  return (REFERRAL_TABS as readonly string[]).includes(value ?? '');
}

// ── Page ──────────────────────────────────────────────────────────────────────

export function AdminReferralsPage() {
  const [params, setParams] = useSearchParams();
  const tabParam = params.get('tab');
  const tab: ReferralTab = isReferralTab(tabParam) ? tabParam : 'card-scans';
  const setTab = (next: ReferralTab) => {
    const sp = new URLSearchParams(params);
    sp.set('tab', next);
    setParams(sp, { replace: true });
  };

  const pending = useQuery<ReferralItem[], ApiError>({
    queryKey: QK_REFERRALS,
    queryFn: getReferrals,
    enabled: tab === 'card-scans',
  });
  const history = useQuery<ReferralHistoryItem[], ApiError>({
    queryKey: QK_REFERRAL_HISTORY,
    queryFn: getReferralHistory,
    enabled: tab === 'card-scans',
  });

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Referrals"
        subtitle="Community members can refer potential LPs, VCs, and startups. Approve to create their account, or reject to dismiss."
      />

      {/* Phase C2 follow-up: card scans vs WhatsApp onboarding split */}
      <div className="flex flex-wrap gap-2" role="tablist" aria-label="Referral source">
        {REFERRAL_TABS.map((t) => (
          <button
            key={t}
            type="button"
            role="tab"
            aria-selected={t === tab}
            onClick={() => setTab(t)}
            className={cn(
              'min-h-9 rounded-md border px-4 py-1 text-sm font-medium transition-colors',
              t === tab
                ? 'border-brand bg-brand text-brand-foreground'
                : 'border-border bg-surface text-ink-body hover:bg-surface-muted',
            )}
            data-testid={`referrals-tab-${t}`}
          >
            {REFERRAL_TAB_LABEL[t]}
          </button>
        ))}
      </div>

      {tab === 'whatsapp' ? (
        <WhatsAppOnboardingTab />
      ) : (
        <>
          {/* Pending */}
          <Card>
            <CardHeader>
              <CardTitle>Pending referrals</CardTitle>
              <CardDescription>
                {pending.isLoading ? 'Loading…' : `${pending.data?.length ?? 0} pending`}
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
              {pending.isLoading ? (
                <div className="flex items-center gap-3 py-4 text-sm text-ink-muted">
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                  Loading referrals…
                </div>
              ) : pending.isError ? (
                <ErrorState error={pending.error} onRetry={() => void pending.refetch()} />
              ) : !pending.data?.length ? (
                <p className="py-4 text-center text-sm text-ink-muted">No pending referrals.</p>
              ) : (
                pending.data.map((item) => (
                  <ReferralRow
                    key={item.scan_id}
                    item={item}
                    onAction={() => {
                      void pending.refetch();
                      void history.refetch();
                    }}
                  />
                ))
              )}
            </CardContent>
          </Card>

          {/* History */}
          <Card>
            <CardHeader>
              <CardTitle>Referral history</CardTitle>
              <CardDescription>Previously approved and rejected referrals.</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
              {history.isLoading ? (
                <div className="flex items-center gap-3 py-4 text-sm text-ink-muted">
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                  Loading history…
                </div>
              ) : history.isError ? (
                <ErrorState error={history.error} onRetry={() => void history.refetch()} />
              ) : !history.data?.length ? (
                <p className="py-4 text-center text-sm text-ink-muted">No history yet.</p>
              ) : (
                history.data.map((item) => <HistoryRow key={item.scan_id} item={item} />)
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
