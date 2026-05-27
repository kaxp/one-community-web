import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { useMatchSuggestions } from '@/features/matchmaking/hooks/use-match-suggestions';
import { useProfileViewers } from '@/features/profile-viewers/hooks/use-profile-viewers';
import { useUser, useRole } from '@/auth/use-auth';
import { colours, fonts, spacing } from '@/design-system/tokens';
import { SurfaceCard } from '@/design-system/components';
import { DashboardHero } from './DashboardHero';
import { QuickGrid } from './QuickGrid';
import { useIsMobile } from '@/lib/hooks/use-is-mobile';

export function VCDashboard() {
  const user = useUser();
  const role = useRole();
  const matches = useMatchSuggestions();
  const viewers = useProfileViewers({ limit: 5 });
  const isMobile = useIsMobile();

  const matchCount = matches.data?.length ?? 0;
  const viewerCount = viewers.data?.pages[0]?.items.length ?? 0;

  const contextLine =
    matchCount > 0
      ? `${matchCount} new startup match${matchCount === 1 ? '' : 'es'} curated for you`
      : viewerCount > 0
        ? `${viewerCount} investor${viewerCount === 1 ? '' : 's'} viewed your profile`
        : 'Your network is growing';

  return (
    <div style={{ background: colours.pageBg, minHeight: '100%' }} data-testid="vc-dashboard">
      <DashboardHero name={user?.name ?? null} role={role ?? 'vc'} contextLine={contextLine} />

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
              { key: 'search', label: 'Search', path: '/search', subtitle: 'Find startups' },
              { key: 'digest', label: 'My Digest', path: '/digest', subtitle: 'Week 47 live' },
              {
                key: 'matchmaking',
                label: 'Opportunities',
                path: '/matchmaking',
                subtitle: matchCount > 0 ? `${matchCount} new` : 'Curated matches',
              },
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
              {
                key: 'add-user',
                label: 'Refer',
                path: '/add-user',
                subtitle: 'Invite to community',
              },
            ]}
          />
        </section>

        {/* Stats row */}
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
            At a glance
          </div>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: isMobile ? '1fr 1fr' : '1fr 1fr',
              gap: 14,
            }}
          >
            <SurfaceCard style={{ padding: isMobile ? 20 : 24 }}>
              {matches.isLoading ? (
                <Skeleton className="h-10 w-full" />
              ) : (
                <>
                  <div
                    style={{
                      fontFamily: fonts.sans,
                      fontSize: 36,
                      fontWeight: 700,
                      color: colours.text,
                      lineHeight: 1,
                    }}
                    data-testid="vc-match-count"
                  >
                    {matchCount}
                  </div>
                  <div
                    style={{
                      fontFamily: fonts.sans,
                      fontSize: 12,
                      color: colours.text3,
                      marginTop: 4,
                    }}
                  >
                    New matches
                  </div>
                  <Link
                    to="/matchmaking"
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
                    View <ArrowRight size={12} />
                  </Link>
                </>
              )}
            </SurfaceCard>

            <SurfaceCard style={{ padding: isMobile ? 20 : 24 }}>
              {viewers.isLoading ? (
                <Skeleton className="h-10 w-full" />
              ) : (
                <>
                  <div
                    style={{
                      fontFamily: fonts.sans,
                      fontSize: 36,
                      fontWeight: 700,
                      color: colours.text,
                      lineHeight: 1,
                    }}
                  >
                    {viewerCount}
                  </div>
                  <div
                    style={{
                      fontFamily: fonts.sans,
                      fontSize: 12,
                      color: colours.text3,
                      marginTop: 4,
                    }}
                  >
                    Profile viewer{viewerCount !== 1 ? 's' : ''}
                  </div>
                  <Link
                    to="/profile-viewers"
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
                    See who viewed <ArrowRight size={12} />
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
