import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { useConnections } from '@/features/connections/hooks/use-connections';
import { useUser, useRole } from '@/auth/use-auth';
import { colours, fonts, radius, spacing } from '@/design-system/tokens';
import { SurfaceCard } from '@/design-system/components';
import { DashboardHero } from './DashboardHero';
import { QuickGrid } from './QuickGrid';
import { useIsMobile } from '@/lib/hooks/use-is-mobile';

export function PartnerDashboard() {
  const user = useUser();
  const role = useRole();
  const connections = useConnections({ limit: 5 });
  const connectionCount = connections.data?.pages[0]?.items.length ?? 0;
  const isMobile = useIsMobile();

  const contextLine =
    connectionCount > 0
      ? `${connectionCount} connection${connectionCount !== 1 ? 's' : ''} in your network`
      : 'Search and connect with startups and LPs';

  return (
    <div style={{ background: colours.pageBg, minHeight: '100%' }} data-testid="partner-dashboard">
      <DashboardHero name={user?.name ?? null} role={role ?? 'partner'} contextLine={contextLine} />

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
              { key: 'search', label: 'Search', path: '/search', subtitle: 'Find startups & LPs' },
              { key: 'digest', label: 'My Digest', path: '/digest', subtitle: 'Week 47 live' },
              {
                key: 'matchmaking',
                label: 'Opportunities',
                path: '/matchmaking',
                subtitle: 'Curated matches',
              },
              {
                key: 'connections',
                label: 'Network',
                path: '/connections',
                subtitle:
                  connectionCount > 0 ? `${connectionCount} connections` : 'Your connections',
              },
              {
                key: 'pending',
                label: 'Pending',
                path: '/connections/pending',
                subtitle: 'Action required',
              },
              { key: 'add-user', label: 'Refer', path: '/add-user', subtitle: 'Invite someone' },
            ]}
          />
        </section>

        {/* Connections snapshot */}
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
            Your network
          </div>
          <SurfaceCard style={{ padding: isMobile ? 20 : 28 }}>
            {connections.isLoading ? (
              <Skeleton className="h-12 w-full" />
            ) : (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 16,
                  flexWrap: 'wrap' as const,
                }}
              >
                <div>
                  <div
                    style={{
                      fontFamily: fonts.sans,
                      fontSize: 40,
                      fontWeight: 700,
                      color: colours.text,
                      lineHeight: 1,
                    }}
                    data-testid="partner-connection-count"
                  >
                    {connectionCount}
                  </div>
                  <div
                    style={{
                      fontFamily: fonts.sans,
                      fontSize: 13,
                      color: colours.text2,
                      marginTop: 4,
                    }}
                  >
                    accepted connection{connectionCount !== 1 ? 's' : ''}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' as const }}>
                  <Link
                    to="/connections"
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 6,
                      fontFamily: fonts.sans,
                      fontSize: 13,
                      fontWeight: 500,
                      color: colours.brand,
                      textDecoration: 'none',
                      padding: '10px 18px',
                      background: colours.brandBg,
                      borderRadius: radius.sm,
                      whiteSpace: 'nowrap' as const,
                    }}
                  >
                    View connections <ArrowRight size={14} />
                  </Link>
                  <Link
                    to="/search"
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 6,
                      fontFamily: fonts.sans,
                      fontSize: 13,
                      fontWeight: 500,
                      color: colours.surface,
                      textDecoration: 'none',
                      padding: '10px 18px',
                      background: colours.brand,
                      borderRadius: radius.sm,
                      whiteSpace: 'nowrap' as const,
                    }}
                    data-testid="partner-search-cta"
                  >
                    Search community
                  </Link>
                </div>
              </div>
            )}
          </SurfaceCard>
        </section>
      </div>
    </div>
  );
}
