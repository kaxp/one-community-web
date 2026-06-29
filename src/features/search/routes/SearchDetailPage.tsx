import { useEffect, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, UserSearch, Clock, UserCheck, Info } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { BlurredText } from '@/components/ui/blurred-text';
import { ErrorState } from '@/components/error-state/ErrorState';
import { EmptyState } from '@/components/empty-state/EmptyState';
import { stageLabel } from '@/features/search/lib/labels';
import { useStartupDetail, useLpDetail } from '@/features/search/hooks/use-search-detail';
import { StartupRichDetailBlock } from '@/features/profile/components/StartupRichDetailBlock';
import { LpRichDetailBlock } from '@/features/profile/components/LpRichDetailBlock';
import { useLogInteraction } from '@/features/interactions/hooks/use-log-interaction';
import { RequestConnectDialog } from '@/features/connections/components/RequestConnectDialog';
import { useRequestInfo } from '@/features/admin/hooks/use-info-requests';
import { can } from '@/lib/role-capabilities';
import { useRole, useUser } from '@/auth/use-auth';
import { qk } from '@/api/query-keys';

// The route receives `targetType` via location.state (set by ResultCard or
// InvestorStartupsPage on navigate). `from` distinguishes catalog navigation
// (investor_startups) from search — catalog views request source=catalog so
// the backend applies identity masking for lp/potential_lp.
type TargetType = 'startup' | 'lp';

interface LocationState {
  targetType?: TargetType;
  ai_reason?: string;
  from?: string;
}

export function SearchDetailPage() {
  const { id } = useParams<{ id: string }>();
  const location = useLocation();
  const navigate = useNavigate();
  const log = useLogInteraction();
  const role = useRole();
  const currentUser = useUser();
  const qc = useQueryClient();

  const state = location.state as LocationState | null;
  const targetType: TargetType = state?.targetType ?? 'startup';
  const aiReason = state?.ai_reason ?? null;
  const isFromCatalog = state?.from === 'investor_startups';

  const startupQuery = useStartupDetail(
    targetType === 'startup' ? id : undefined,
    isFromCatalog ? 'catalog' : undefined,
  );
  const lpQuery = useLpDetail(targetType === 'lp' ? id : undefined);

  const isLoading = targetType === 'startup' ? startupQuery.isLoading : lpQuery.isLoading;
  const isError = targetType === 'startup' ? startupQuery.isError : lpQuery.isError;
  const error = targetType === 'startup' ? startupQuery.error : lpQuery.error;
  const startupData = startupQuery.data;
  const lpData = lpQuery.data;

  // Connect dialog state
  const [connectOpen, setConnectOpen] = useState(false);
  // Optimistic connection status — set to pending_admin immediately after request
  const [sentRequest, setSentRequest] = useState(false);

  const connectionStatus = sentRequest
    ? 'pending_admin'
    : ((targetType === 'startup' ? startupData?.connection_status : lpData?.connection_status) ??
      null);

  const identityMasked = isFromCatalog && (startupData?.identity_masked ?? false);
  const infoRequestStatus = startupData?.info_request_status ?? null;

  const canConnect =
    !!id && can(role, 'connections.request') && currentUser?.id !== id && !connectionStatus;

  const targetName =
    targetType === 'startup' ? (startupData?.company_name ?? 'Startup') : (lpData?.name ?? 'LP');

  // Log profile_view once data loads.
  useEffect(() => {
    if (!id) return;
    const hasData = targetType === 'startup' ? !!startupData : !!lpData;
    if (!hasData) return;
    log({
      target_id: id,
      interaction_type: 'profile_view',
      target_type: targetType,
      source: 'search_detail_page',
    });
  }, [id, targetType, startupData, lpData, log]);

  if (!id) {
    return (
      <EmptyState
        icon={UserSearch}
        title="Missing profile id"
        description="Open this page from a search result."
        action={
          <Button variant="outline" onClick={() => navigate('/search')}>
            Go to search
          </Button>
        }
      />
    );
  }

  if (isLoading) {
    return <DetailSkeleton />;
  }

  if (isError) {
    return (
      <div className="flex flex-col gap-6">
        <Button
          variant="ghost"
          size="sm"
          className="self-start"
          onClick={() => navigate(-1)}
          aria-label="Go back"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden />
          <span>Back</span>
        </Button>
        <ErrorState
          error={error}
          onRetry={() => {
            if (targetType === 'startup') void startupQuery.refetch();
            else void lpQuery.refetch();
          }}
          onGoBack={() => navigate(-1)}
        />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <Button
        variant="ghost"
        size="sm"
        className="self-start"
        onClick={() => navigate(-1)}
        aria-label="Go back"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden />
        <span>Back</span>
      </Button>

      {/* AI match reason — only shown when navigating from a search result */}
      {aiReason ? (
        <div className="rounded-lg border border-brand/20 bg-brand/5 px-4 py-3">
          <p className="mb-1 text-xs font-medium uppercase tracking-wide text-brand">
            Relevance Insight
          </p>
          <p className="text-sm italic text-brand">{`"${aiReason}"`}</p>
        </div>
      ) : null}

      {targetType === 'startup' && startupData ? (
        <>
          {/* Header card */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <CardTitle className="text-xl">
                    {identityMasked ? <BlurredText /> : (startupData.company_name ?? 'Startup')}
                  </CardTitle>
                  {!identityMasked && startupData.one_liner ? (
                    <p className="mt-1 text-sm text-ink-body">{startupData.one_liner}</p>
                  ) : null}
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {startupData.sector ? (
                    <Badge variant="secondary">{startupData.sector}</Badge>
                  ) : null}
                  {startupData.stage ? (
                    <Badge variant="outline">{stageLabel(startupData.stage)}</Badge>
                  ) : null}
                </div>
              </div>
            </CardHeader>
            <CardContent className="flex flex-col gap-3 pt-0">
              {!identityMasked && startupData.description ? (
                <p className="text-sm text-ink-body">{startupData.description}</p>
              ) : null}
              {identityMasked ? (
                <RequestInfoSection
                  startupId={startupData.startup_id ?? id ?? ''}
                  infoRequestStatus={infoRequestStatus}
                  onSuccess={() => void startupQuery.refetch()}
                />
              ) : (
                <ConnectSection
                  canConnect={canConnect}
                  connectionStatus={connectionStatus}
                  onConnect={() => setConnectOpen(true)}
                />
              )}
            </CardContent>
          </Card>

          <StartupRichDetailBlock detail={startupData} />
        </>
      ) : null}

      {targetType === 'lp' && lpData ? (
        <>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-xl">{lpData.name ?? 'LP'}</CardTitle>
              {lpData.organisation ? (
                <p className="text-sm text-ink-muted">{lpData.organisation}</p>
              ) : null}
              {lpData.designation ? (
                <p className="text-sm text-ink-muted">{lpData.designation}</p>
              ) : null}
            </CardHeader>
            <CardContent className="pt-0">
              <ConnectSection
                canConnect={canConnect}
                connectionStatus={connectionStatus}
                onConnect={() => setConnectOpen(true)}
              />
            </CardContent>
          </Card>

          <LpRichDetailBlock detail={lpData} />
        </>
      ) : null}

      <RequestConnectDialog
        open={connectOpen}
        onOpenChange={setConnectOpen}
        targetId={id}
        targetName={targetName}
        messageHint={aiReason}
        onSuccess={() => {
          setSentRequest(true);
          void qc.invalidateQueries({ queryKey: qk.search.detailStartup(id) });
          void qc.invalidateQueries({ queryKey: qk.search.detailLp(id) });
        }}
      />
    </div>
  );
}

interface ConnectSectionProps {
  canConnect: boolean;
  connectionStatus: string | null;
  onConnect: () => void;
}

interface RequestInfoSectionProps {
  startupId: string;
  infoRequestStatus: string | null;
  onSuccess: () => void;
}

function RequestInfoSection({ startupId, infoRequestStatus, onSuccess }: RequestInfoSectionProps) {
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState('');
  const requestInfo = useRequestInfo();

  if (infoRequestStatus === 'pending') {
    return (
      <div className="flex items-center gap-1.5 text-sm text-ink-muted">
        <Clock className="h-4 w-4" aria-hidden />
        Info request sent — awaiting admin approval
      </div>
    );
  }

  if (!infoRequestStatus) {
    const handleSubmit = () => {
      requestInfo.mutate(
        { startup_id: startupId, ...(message ? { message } : {}) },
        {
          onSuccess: () => {
            onSuccess();
            setOpen(false);
            setMessage('');
          },
        },
      );
    };

    return (
      <>
        <Button size="sm" className="self-start" onClick={() => setOpen(true)}>
          <Info className="mr-1.5 h-4 w-4" aria-hidden />
          Request Info
        </Button>
        <Dialog
          open={open}
          onOpenChange={(o) => {
            if (!o) {
              setOpen(false);
              setMessage('');
            } else {
              setOpen(true);
            }
          }}
        >
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Request Company Info</DialogTitle>
            </DialogHeader>
            <div className="flex flex-col gap-3 py-2">
              <p className="text-sm text-ink-muted">
                Your request will be reviewed by the Warmup Ventures team. Once approved,
                you&apos;ll receive the full company profile via WhatsApp.
              </p>
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium text-ink-heading">
                  Note <span className="font-normal text-ink-muted">(optional, max 200 chars)</span>
                </label>
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value.slice(0, 200))}
                  rows={3}
                  className="w-full resize-none rounded-md border border-border bg-white px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-brand"
                  placeholder="Why are you interested in this company?"
                />
                <span className="self-end text-[10px] text-ink-muted">{message.length}/200</span>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" size="sm" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button size="sm" onClick={handleSubmit} disabled={requestInfo.isPending}>
                {requestInfo.isPending ? 'Requesting…' : 'Request Info'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </>
    );
  }

  return null;
}

function ConnectSection({ canConnect, connectionStatus, onConnect }: ConnectSectionProps) {
  if (connectionStatus === 'accepted') {
    return (
      <div className="flex items-center gap-1.5 text-sm font-medium text-brand">
        <UserCheck className="h-4 w-4" aria-hidden />
        Connected
      </div>
    );
  }
  if (connectionStatus === 'pending_admin' || connectionStatus === 'pending_target') {
    return (
      <div className="flex items-center gap-1.5 text-sm text-ink-muted">
        <Clock className="h-4 w-4" aria-hidden />
        Request sent — awaiting admin approval
      </div>
    );
  }
  if (canConnect) {
    return (
      <Button size="sm" className="self-start" onClick={onConnect}>
        Request to connect
      </Button>
    );
  }
  return null;
}

function DetailSkeleton() {
  return (
    <div className="flex flex-col gap-6" data-testid="search-detail-loading">
      <Skeleton className="h-9 w-20" />
      <Card>
        <CardContent className="flex flex-col gap-3 p-6">
          <Skeleton className="h-7 w-48" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-3/4" />
        </CardContent>
      </Card>
      <Card>
        <CardContent className="grid grid-cols-2 gap-4 p-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-10 w-full" />
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
