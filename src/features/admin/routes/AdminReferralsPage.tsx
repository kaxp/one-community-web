import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { CheckCircle2, XCircle, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { z } from 'zod';
import { zUUID } from '@/lib/zod-helpers';
import { apiClient } from '@/api/client';
import type { ApiEnvelope } from '@/types/api';
import type { ApiError } from '@/api/errors';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { RoleBadge } from '@/components/role-badge';
import { ErrorState } from '@/components/error-state/ErrorState';

// ── Schemas ──────────────────────────────────────────────────────────────────

const zReferralItem = z.object({
  scan_id: zUUID,
  referrer_name: z.string().nullable(),
  referrer_role: z.string().nullable(),
  contact_name: z.string().nullable(),
  contact_phone: z.string().nullable(),
  contact_email: z.string().nullable(),
  contact_role: z.string().nullable(),
  created_at: z.string(),
});
type ReferralItem = z.infer<typeof zReferralItem>;

const zReferralListResponse = z.object({ items: z.array(zReferralItem) });
const zReferralActionResponse = z.object({
  scan_id: zUUID,
  status: z.string(),
  user_id: zUUID.nullable(),
});

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

async function rejectReferral(scanId: string) {
  const resp = await apiClient.post<ApiEnvelope<unknown>>(`/admin/referrals/${scanId}/reject`);
  return zReferralActionResponse.parse(resp.data.data);
}

const QK_REFERRALS = ['admin', 'referrals'] as const;

// ── Component ─────────────────────────────────────────────────────────────────

function ReferralRow({ item, onAction }: { item: ReferralItem; onAction: () => void }) {
  const qc = useQueryClient();
  const [acting, setActing] = useState<'approve' | 'reject' | null>(null);

  const approve = useMutation<unknown, ApiError, string>({
    mutationFn: approveReferral,
    onSuccess: () => {
      toast.success('Referral approved — user created.');
      void qc.invalidateQueries({ queryKey: QK_REFERRALS });
      onAction();
    },
    onError: (e) => toast.error(e.userMessage),
    onSettled: () => setActing(null),
  });

  const reject = useMutation<unknown, ApiError, string>({
    mutationFn: rejectReferral,
    onSuccess: () => {
      toast.success('Referral rejected.');
      void qc.invalidateQueries({ queryKey: QK_REFERRALS });
      onAction();
    },
    onError: (e) => toast.error(e.userMessage),
    onSettled: () => setActing(null),
  });

  const busy = approve.isPending || reject.isPending;

  return (
    <div className="flex flex-col gap-3 rounded-lg border border-border bg-surface p-4 sm:flex-row sm:items-start sm:justify-between">
      <div className="flex flex-col gap-1">
        <div className="flex flex-wrap items-center gap-2 text-sm font-medium text-ink-heading">
          <span>{item.contact_name ?? '—'}</span>
          {item.contact_role ? (
            <span className="rounded-full bg-surface-muted px-2 py-0.5 text-xs text-ink-muted capitalize">
              {item.contact_role.replace('_', ' ')}
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
          disabled={busy}
          onClick={() => {
            setActing('reject');
            reject.mutate(item.scan_id);
          }}
          className="text-error hover:border-error hover:text-error"
        >
          {acting === 'reject' && busy ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <XCircle className="h-3.5 w-3.5" />
          )}
          Reject
        </Button>
        <Button
          size="sm"
          disabled={busy}
          onClick={() => {
            setActing('approve');
            approve.mutate(item.scan_id);
          }}
        >
          {acting === 'approve' && busy ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <CheckCircle2 className="h-3.5 w-3.5" />
          )}
          Approve
        </Button>
      </div>
    </div>
  );
}

export function AdminReferralsPage() {
  const { data, isLoading, isError, error, refetch } = useQuery<ReferralItem[], ApiError>({
    queryKey: QK_REFERRALS,
    queryFn: getReferrals,
  });

  return (
    <div className="flex flex-col gap-6">
      <header>
        <h1 className="text-3xl font-semibold text-ink-heading">Referrals</h1>
        <p className="text-sm text-ink-muted">
          Community members can refer potential LPs, VCs, and startups. Approve to create their
          account, or reject to dismiss.
        </p>
      </header>

      <Card>
        <CardHeader>
          <CardTitle>Pending referrals</CardTitle>
          <CardDescription>
            {isLoading ? 'Loading…' : `${data?.length ?? 0} pending`}
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          {isLoading ? (
            <div className="flex items-center gap-3 py-4 text-sm text-ink-muted">
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
              Loading referrals…
            </div>
          ) : isError ? (
            <ErrorState error={error} onRetry={() => void refetch()} />
          ) : !data?.length ? (
            <p className="py-4 text-center text-sm text-ink-muted">No pending referrals.</p>
          ) : (
            data.map((item) => (
              <ReferralRow key={item.scan_id} item={item} onAction={() => void refetch()} />
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
