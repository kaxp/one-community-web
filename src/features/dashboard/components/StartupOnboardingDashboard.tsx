import { Link } from 'react-router-dom';
import { CheckCircle2, Circle } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { ErrorState } from '@/components/error-state/ErrorState';
import { useStartupProfile } from '@/features/pitch/hooks/use-startup-profile';
import { useUser, useRole } from '@/auth/use-auth';
import { colours, fonts, radius, spacing } from '@/design-system/tokens';
import { SurfaceCard } from '@/design-system/components';
import { DashboardHero } from './DashboardHero';
import { QuickGrid } from './QuickGrid';
import { useIsMobile } from '@/lib/hooks/use-is-mobile';

function CheckItem({ done, label }: { done: boolean; label: string }) {
  return (
    <li
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        padding: '10px 0',
        borderBottom: `1px solid ${colours.border}`,
      }}
    >
      {done ? (
        <CheckCircle2 size={16} color={colours.positive} aria-hidden style={{ flexShrink: 0 }} />
      ) : (
        <Circle size={16} color={colours.text3} aria-hidden style={{ flexShrink: 0 }} />
      )}
      <span
        style={{
          fontFamily: fonts.sans,
          fontSize: 14,
          color: done ? colours.text3 : colours.text,
          textDecoration: done ? 'line-through' : 'none',
        }}
      >
        {label}
      </span>
    </li>
  );
}

export function StartupOnboardingDashboard() {
  const user = useUser();
  const role = useRole();
  const profile = useStartupProfile();
  const isMobile = useIsMobile();

  const p = profile.data?.status === 'present' ? profile.data.data : null;
  const hasProfile = profile.data?.status === 'present';
  const hasTagline = !!p?.tagline;
  const hasSector = !!p?.sector;
  const hasStage = !!p?.stage;
  const hasDeck = !!p?.deck_url;
  const allDone = hasProfile && hasTagline && hasSector && hasStage && hasDeck;

  const completedCount = [hasTagline, hasSector, hasStage, hasDeck].filter(Boolean).length;
  const contextLine = allDone
    ? "Your profile is complete — you're discoverable by investors"
    : `${completedCount}/4 profile steps complete`;

  return (
    <div
      style={{ background: colours.pageBg, minHeight: '100%' }}
      data-testid="startup-onboarding-dashboard"
    >
      <DashboardHero
        name={user?.name ?? null}
        role={role ?? 'startup_onboarded'}
        contextLine={contextLine}
      />

      <div
        style={{
          padding: isMobile ? '24px 20px' : '32px 40px',
          display: 'flex',
          flexDirection: 'column',
          gap: spacing.sectionGap,
        }}
      >
        {/* Quick access */}
        <section>
          <div
            style={{
              fontFamily: fonts.sans,
              fontSize: 11,
              fontWeight: 500,
              letterSpacing: '.1em',
              textTransform: 'uppercase' as const,
              color: colours.text3,
              marginBottom: 12,
            }}
          >
            Quick access
          </div>
          <QuickGrid
            tiles={[
              { key: 'pitch', label: 'My Pitch', path: '/my-pitch', subtitle: 'Edit your profile' },
              {
                key: 'connections',
                label: 'Network',
                path: '/connections',
                subtitle: 'Your connections',
              },
              {
                key: 'pending',
                label: 'Pending',
                path: '/connections/pending',
                subtitle: 'Action required',
              },
            ]}
          />
        </section>

        {/* Profile checklist */}
        <section>
          <div
            style={{
              fontFamily: fonts.sans,
              fontSize: 11,
              fontWeight: 500,
              letterSpacing: '.1em',
              textTransform: 'uppercase' as const,
              color: colours.text3,
              marginBottom: 12,
            }}
          >
            Profile checklist
          </div>
          <SurfaceCard style={{ padding: isMobile ? 20 : 28 }}>
            {/* Progress bar */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
              <div
                style={{
                  flex: 1,
                  height: 4,
                  background: colours.border,
                  borderRadius: 2,
                  overflow: 'hidden',
                }}
              >
                <div
                  style={{
                    height: '100%',
                    width: `${(completedCount / 4) * 100}%`,
                    background: allDone ? colours.positive : colours.brand,
                    borderRadius: 2,
                    transition: 'width 0.4s ease',
                  }}
                />
              </div>
              <span
                style={{
                  fontFamily: fonts.sans,
                  fontSize: 12,
                  color: colours.text2,
                  flexShrink: 0,
                }}
              >
                {completedCount}/4
              </span>
            </div>

            {profile.isLoading ? (
              <div
                style={{ display: 'flex', flexDirection: 'column', gap: 12 }}
                data-testid="onboarding-dash-loading"
              >
                {Array.from({ length: 4 }).map((_, i) => (
                  <Skeleton key={i} className="h-10 w-full" />
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
              <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
                <CheckItem done={hasTagline} label="Write a tagline / one-liner pitch" />
                <CheckItem done={hasSector} label="Tag your sector" />
                <CheckItem done={hasStage} label="Set your funding stage" />
                <CheckItem done={hasDeck} label="Upload your pitch deck" />
              </ul>
            )}

            {!allDone && !profile.isLoading ? (
              <Link
                to="/my-pitch"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  fontFamily: fonts.sans,
                  fontSize: 13,
                  fontWeight: 500,
                  color: colours.surface,
                  background: colours.brand,
                  padding: '10px 20px',
                  borderRadius: radius.sm,
                  textDecoration: 'none',
                  marginTop: 20,
                }}
                data-testid="onboarding-dash-cta"
              >
                {hasProfile ? 'Complete your pitch profile' : 'Create your pitch profile'}
              </Link>
            ) : null}
          </SurfaceCard>
        </section>
      </div>
    </div>
  );
}
