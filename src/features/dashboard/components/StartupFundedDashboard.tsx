import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { useStartupProfile } from '@/features/pitch/hooks/use-startup-profile';
import { useConnectionsPending } from '@/features/connections/hooks/use-connections-pending';
import { useUser, useRole } from '@/auth/use-auth';
import { colours, fonts, spacing } from '@/design-system/tokens';
import { SurfaceCard } from '@/design-system/components';
import { DashboardHero } from './DashboardHero';
import { QuickGrid } from './QuickGrid';
import { useIsMobile } from '@/lib/hooks/use-is-mobile';

export function StartupFundedDashboard() {
  const user = useUser();
  const role = useRole();
  const profile = useStartupProfile();
  const pending = useConnectionsPending({ limit: 10 });
  const isMobile = useIsMobile();

  const pitch = profile.data?.status === 'present' ? profile.data.data : null;
  const hasDeck = !!pitch?.deck_url;
  const incomingPending = (pending.data?.pages[0]?.items ?? []).filter(
    (c) => c.direction === 'incoming',
  );

  const contextLine =
    incomingPending.length > 0
      ? `${incomingPending.length} pending connection request${incomingPending.length !== 1 ? 's' : ''}`
      : hasDeck
        ? 'Your deck is live — investors can discover you'
        : 'Upload your deck to get discovered';

  return (
    <div
      style={{ background: colours.pageBg, minHeight: '100%' }}
      data-testid="startup-funded-dashboard"
    >
      <DashboardHero
        name={user?.name ?? null}
        role={role ?? 'startup_funded'}
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
              {
                key: 'pitch',
                label: 'My Pitch',
                path: '/my-pitch',
                subtitle: 'Manage your profile',
              },
              { key: 'mis', label: 'MIS Report', path: '/mis', subtitle: 'Monthly submission' },
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
                subtitle:
                  incomingPending.length > 0
                    ? `${incomingPending.length} action${incomingPending.length !== 1 ? 's' : ''}`
                    : 'Action required',
              },
              { key: 'search', label: 'Search', path: '/search', subtitle: 'Find investors' },
              {
                key: 'matchmaking',
                label: 'Opportunities',
                path: '/matchmaking',
                subtitle: 'Curated matches',
              },
            ]}
          />
        </section>

        {/* Status cards */}
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
            Status
          </div>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: isMobile ? '1fr 1fr' : '1fr 1fr',
              gap: 14,
            }}
          >
            <SurfaceCard style={{ padding: isMobile ? 20 : 24 }}>
              {profile.isLoading ? (
                <Skeleton className="h-10 w-full" />
              ) : (
                <>
                  <div
                    style={{
                      fontFamily: fonts.sans,
                      fontSize: 12,
                      color: colours.text3,
                      marginBottom: 8,
                    }}
                  >
                    Pitch deck
                  </div>
                  {hasDeck ? (
                    <Badge variant="success" className="w-fit">
                      Deck submitted
                    </Badge>
                  ) : (
                    <div style={{ fontFamily: fonts.sans, fontSize: 13, color: colours.text2 }}>
                      No deck uploaded yet.
                    </div>
                  )}
                  <Link
                    to="/my-pitch"
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 4,
                      fontFamily: fonts.sans,
                      fontSize: 12,
                      fontWeight: 500,
                      color: colours.brand,
                      textDecoration: 'none',
                      marginTop: 12,
                    }}
                  >
                    View pitch <ArrowRight size={12} />
                  </Link>
                </>
              )}
            </SurfaceCard>

            <SurfaceCard style={{ padding: isMobile ? 20 : 24 }}>
              {pending.isLoading ? (
                <Skeleton className="h-10 w-full" />
              ) : (
                <>
                  <div
                    style={{
                      fontFamily: fonts.sans,
                      fontSize: 12,
                      color: colours.text3,
                      marginBottom: 8,
                    }}
                  >
                    Connection requests
                  </div>
                  <div
                    style={{
                      fontFamily: fonts.sans,
                      fontSize: 36,
                      fontWeight: 700,
                      color: colours.text,
                      lineHeight: 1,
                    }}
                    data-testid="startup-pending-count"
                  >
                    {incomingPending.length}
                  </div>
                  <Link
                    to="/connections/pending"
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 4,
                      fontFamily: fonts.sans,
                      fontSize: 12,
                      fontWeight: 500,
                      color: colours.brand,
                      textDecoration: 'none',
                      marginTop: 12,
                    }}
                  >
                    View requests <ArrowRight size={12} />
                  </Link>
                </>
              )}
            </SurfaceCard>
          </div>
        </section>
      </div>
    </div>
  );
}
