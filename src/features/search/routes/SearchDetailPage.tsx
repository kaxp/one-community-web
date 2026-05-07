import { useEffect, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, UserSearch, Clock, UserCheck } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { ErrorState } from '@/components/error-state/ErrorState';
import { EmptyState } from '@/components/empty-state/EmptyState';
import { stageLabel } from '@/features/search/lib/labels';
import { useStartupDetail, useLpDetail } from '@/features/search/hooks/use-search-detail';
import { StartupRichDetailBlock } from '@/features/profile/components/StartupRichDetailBlock';
import { LpRichDetailBlock } from '@/features/profile/components/LpRichDetailBlock';
import { useLogInteraction } from '@/features/interactions/hooks/use-log-interaction';
import { RequestConnectDialog } from '@/features/connections/components/RequestConnectDialog';
import { can } from '@/lib/role-capabilities';
import { useRole, useUser } from '@/auth/use-auth';
import { qk } from '@/api/query-keys';

// The route receives `targetType` via location.state (set by ResultCard on
// navigate). This avoids polluting the URL while keeping the page bookmarkable
// as a startup-first fallback (unknown type → tries startup endpoint).
type TargetType = 'startup' | 'lp';

interface LocationState {
  targetType?: TargetType;
  ai_reason?: string;
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

  const startupQuery = useStartupDetail(targetType === 'startup' ? id : undefined);
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
                  <CardTitle className="text-xl">{startupData.company_name ?? 'Startup'}</CardTitle>
                  {startupData.one_liner ? (
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
              {startupData.description ? (
                <p className="text-sm text-ink-body">{startupData.description}</p>
              ) : null}
              <ConnectSection
                canConnect={canConnect}
                connectionStatus={connectionStatus}
                onConnect={() => setConnectOpen(true)}
              />
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
