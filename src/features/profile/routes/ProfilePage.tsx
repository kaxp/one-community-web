import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Lock, Sparkles, UserSearch } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { ErrorState } from '@/components/error-state/ErrorState';
import { EmptyState } from '@/components/empty-state/EmptyState';
import { ApiError } from '@/api/errors';
import { useRole } from '@/auth/use-auth';
import { can } from '@/lib/role-capabilities';
import { useLogInteraction } from '@/features/interactions/hooks/use-log-interaction';
import { useProfile } from '@/features/profile/hooks/use-profile';
import { profileTargetType, type ProfileView } from '@/features/profile/schemas';
import { ProfileHeader } from '@/features/profile/components/ProfileHeader';
import { StartupProfileBlock } from '@/features/profile/components/StartupBlock';
import { LPProfileBlock } from '@/features/profile/components/LPBlock';
import { ContactCard } from '@/features/profile/components/ContactCard';
import { RequestConnectDialog } from '@/features/connections/components/RequestConnectDialog';

export function ProfilePage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const role = useRole();
  // Partner viewers see Crunchbase-style locked placeholders for fields the
  // backend strips (decisions.md [P-21]).
  const isMasked = role === 'partner';
  const log = useLogInteraction();

  const query = useProfile(id);
  const profile = query.data;

  // Fire `profile_view` ONCE per (target, viewer) per PRD §7.5.1 UI flow #3.
  // The hook's module-level dedup (10s window) absorbs StrictMode double-invokes
  // and any mount→unmount→remount within that window. Server-side dedup is 60s.
  useEffect(() => {
    if (!profile) return;
    log({
      target_id: profile.user_id,
      interaction_type: 'profile_view',
      target_type: profileTargetType(profile.role),
      source: 'profile_page',
    });
  }, [profile, log]);

  if (!id) {
    return (
      <EmptyState
        icon={UserSearch}
        title="Missing profile id"
        description="Open this page from a search result or a connection."
        action={
          <Button asChild variant="outline">
            <Link to="/search">Go to search</Link>
          </Button>
        }
      />
    );
  }

  if (query.isLoading) {
    return <ProfileSkeleton />;
  }

  if (query.isError) {
    const err = query.error;
    if (err instanceof ApiError && err.status === 404) {
      return (
        <EmptyState
          icon={UserSearch}
          title="Profile not found"
          description="This person may have left the community, or the link is no longer valid."
          action={
            <Button variant="outline" onClick={() => navigate(-1)}>
              <ArrowLeft className="h-4 w-4" aria-hidden />
              <span>Go back</span>
            </Button>
          }
        />
      );
    }
    return (
      <ErrorState
        error={err}
        onRetry={() => {
          void query.refetch();
        }}
        onGoBack={() => navigate(-1)}
      />
    );
  }

  if (!profile) {
    // The query is settled but no data — shouldn't happen with `enabled: !!id`,
    // but render the same empty state rather than blank screen.
    return (
      <EmptyState
        icon={UserSearch}
        title="Nothing to show yet"
        description="Try refreshing the page."
      />
    );
  }

  return <ProfileBody profile={profile} isMasked={isMasked} role={role} />;
}

function ProfileBody({
  profile,
  isMasked,
  role,
}: {
  profile: ProfileView;
  isMasked: boolean;
  role: ReturnType<typeof useRole>;
}) {
  const navigate = useNavigate();
  const [dialogOpen, setDialogOpen] = useState(false);
  // Capability + state-derived rules per PRD §7.5.1 UI flow.
  const canRequestRole = can(role, 'connections.request');
  const showRequestButton =
    canRequestRole &&
    profile.can_request_connect &&
    !profile.viewer_interaction.has_requested &&
    !profile.viewer_interaction.has_connected;
  const showPendingStatus =
    profile.viewer_interaction.has_requested && !profile.viewer_interaction.has_connected;
  const showConnectedStatus = profile.viewer_interaction.has_connected;

  const isStartupTarget = useMemo(
    () =>
      profile.role === 'startup_inprogress' ||
      profile.role === 'startup_onboarded' ||
      profile.role === 'startup_funded',
    [profile.role],
  );
  const isLPTarget = useMemo(
    () => profile.role === 'lp' || profile.role === 'potential_lp',
    [profile.role],
  );

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

      <Card>
        <CardContent className="p-6">
          <ProfileHeader profile={profile} isMasked={isMasked} />
          <div className="mt-5 flex flex-wrap items-center gap-2">
            {showRequestButton ? (
              <Button onClick={() => setDialogOpen(true)}>Request to connect</Button>
            ) : null}
            {showPendingStatus ? (
              <span
                className="inline-flex items-center gap-1 rounded-full border border-warning/30 bg-warning/10 px-3 py-1 text-xs font-medium text-warning"
                role="status"
              >
                <Lock className="h-3.5 w-3.5" aria-hidden />
                Pending admin approval
              </span>
            ) : null}
            {showConnectedStatus ? (
              <span
                className="inline-flex items-center gap-1 rounded-full border border-success/30 bg-success/10 px-3 py-1 text-xs font-medium text-success"
                role="status"
              >
                <Sparkles className="h-3.5 w-3.5" aria-hidden />
                Connected
              </span>
            ) : null}
          </div>
        </CardContent>
      </Card>

      {isStartupTarget && profile.startup ? (
        <StartupProfileBlock block={profile.startup} isMasked={isMasked} />
      ) : null}
      {isLPTarget && profile.lp_profile ? (
        <LPProfileBlock block={profile.lp_profile} isMasked={isMasked} />
      ) : null}

      {profile.contact ? <ContactCard contact={profile.contact} /> : null}

      <RequestConnectDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        targetId={profile.user_id}
        targetName={profile.name}
      />
    </div>
  );
}

function ProfileSkeleton() {
  return (
    <div className="flex flex-col gap-6" data-testid="profile-loading">
      <Skeleton className="h-9 w-24" />
      <Card>
        <CardContent className="flex flex-col gap-4 p-6 sm:flex-row sm:items-start sm:gap-6">
          <Skeleton className="h-16 w-16 rounded-full" />
          <div className="flex flex-1 flex-col gap-2">
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-4 w-24" />
          </div>
        </CardContent>
      </Card>
      <Skeleton className="h-48 w-full" />
    </div>
  );
}
