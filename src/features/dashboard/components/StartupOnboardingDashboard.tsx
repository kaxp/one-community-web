import { Link } from 'react-router-dom';
import { CheckCircle2, Circle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { ErrorState } from '@/components/error-state/ErrorState';
import { useStartupProfile } from '@/features/pitch/hooks/use-startup-profile';

function CheckItem({ done, label }: { done: boolean; label: string }) {
  return (
    <li className="flex items-center gap-2 text-sm">
      {done ? (
        <CheckCircle2 className="h-4 w-4 flex-none text-success" aria-hidden />
      ) : (
        <Circle className="h-4 w-4 flex-none text-ink-muted" aria-hidden />
      )}
      <span className={done ? 'text-ink-muted line-through' : 'text-ink-heading'}>{label}</span>
    </li>
  );
}

export function StartupOnboardingDashboard() {
  const profile = useStartupProfile();

  const p = profile.data?.status === 'present' ? profile.data.data : null;
  const hasProfile = profile.data?.status === 'present';
  const hasTagline = !!p?.tagline;
  const hasSector = !!p?.sector;
  const hasStage = !!p?.stage;
  const hasDeck = !!p?.deck_url;
  const allDone = hasProfile && hasTagline && hasSector && hasStage && hasDeck;

  return (
    <div className="flex flex-col gap-6" data-testid="startup-onboarding-dashboard">
      <header>
        <h1 className="text-3xl font-semibold text-ink-heading">Dashboard</h1>
        <p className="text-sm text-ink-muted">
          Complete your profile to get discovered by LPs and VCs.
        </p>
      </header>

      <Card className="max-w-lg">
        <CardHeader>
          <CardTitle>Profile checklist</CardTitle>
          <CardDescription>
            {allDone
              ? "Your profile is complete — you're discoverable in search."
              : 'Finish these steps to appear in investor searches.'}
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {profile.isLoading ? (
            <div className="flex flex-col gap-3" data-testid="onboarding-dash-loading">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-6 w-full" />
              ))}
            </div>
          ) : profile.isError ? (
            <ErrorState
              error={profile.error}
              onRetry={() => {
                void profile.refetch();
              }}
            />
          ) : (
            <ul className="flex flex-col gap-3">
              <CheckItem done={hasTagline} label="Write a tagline / one-liner pitch" />
              <CheckItem done={hasSector} label="Tag your sector" />
              <CheckItem done={hasStage} label="Set your funding stage" />
              <CheckItem done={hasDeck} label="Upload your pitch deck" />
            </ul>
          )}

          {!allDone && !profile.isLoading ? (
            <Button asChild className="mt-2 w-fit" data-testid="onboarding-dash-cta">
              <Link to="/pitch">
                {hasProfile ? 'Complete your pitch profile' : 'Create your pitch profile'}
              </Link>
            </Button>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}
