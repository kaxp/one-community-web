import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { useMyDigests } from '@/features/digest/hooks/use-my-digests';
import { useMatchSuggestions } from '@/features/matchmaking/hooks/use-match-suggestions';
import { useUser, useRole } from '@/auth/use-auth';
import { colours, fonts, radius, spacing } from '@/design-system/tokens';
import { SurfaceCard } from '@/design-system/components';
import { DashboardHero } from './DashboardHero';
import { QuickGrid } from './QuickGrid';
import { useIsMobile } from '@/lib/hooks/use-is-mobile';

export function LPDashboard() {
  const user = useUser();
  const role = useRole();
  const digests = useMyDigests({ limit: 3 });
  const matches = useMatchSuggestions();
  const isMobile = useIsMobile();

  const matchCount = matches.data?.length ?? 0;

  const contextLine =
    matchCount > 0
      ? `${matchCount} new opportunit${matchCount === 1 ? 'y' : 'ies'} curated for you`
      : 'Week 47 digest is live';

  return (
    <div style={{ background: colours.pageBg, minHeight: '100%' }} data-testid="lp-dashboard">
      <DashboardHero name={user?.name ?? null} role={role ?? 'lp'} contextLine={contextLine} />

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
              { key: 'search', label: 'Search', path: '/search', subtitle: 'Find startups & VCs' },
              {
                key: 'portfolio-fund-deck',
                label: 'Fund Deck',
                path: '/portfolio-fund-deck',
                subtitle: 'Portfolio & returns',
              },
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
            ]}
          />
        </section>

        {/* Digest preview */}
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
            Latest Intelligence
          </div>
          <SurfaceCard style={{ padding: isMobile ? 20 : 28 }}>
            {digests.isLoading ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-6 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
              </div>
            ) : (
              <div
                style={{
                  display: 'flex',
                  flexDirection: isMobile ? 'column' : 'row',
                  alignItems: isMobile ? 'flex-start' : 'center',
                  gap: 20,
                }}
              >
                <div style={{ flex: 1 }}>
                  <div
                    style={{
                      fontFamily: fonts.sans,
                      fontSize: 11,
                      fontWeight: 500,
                      color: colours.text3,
                      letterSpacing: '.08em',
                      textTransform: 'uppercase' as const,
                      marginBottom: 8,
                    }}
                  >
                    Week 47 · May 17, 2026
                  </div>
                  <div
                    style={{
                      fontFamily: fonts.serif,
                      fontSize: isMobile ? 18 : 22,
                      fontWeight: 400,
                      color: colours.text,
                      lineHeight: 1.35,
                      marginBottom: 10,
                      letterSpacing: '-0.2px',
                    }}
                  >
                    Defense-tech and premium consumer growth led ₹830 Cr in capital activity this
                    week.
                  </div>
                  <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap' as const }}>
                    <div>
                      <div
                        style={{
                          fontFamily: fonts.sans,
                          fontSize: 20,
                          fontWeight: 600,
                          color: colours.text,
                        }}
                      >
                        ₹830 Cr
                      </div>
                      <div style={{ fontFamily: fonts.sans, fontSize: 11, color: colours.text3 }}>
                        Capital tracked
                      </div>
                    </div>
                    <div>
                      <div
                        style={{
                          fontFamily: fonts.sans,
                          fontSize: 20,
                          fontWeight: 600,
                          color: colours.text,
                        }}
                      >
                        7
                      </div>
                      <div style={{ fontFamily: fonts.sans, fontSize: 11, color: colours.text3 }}>
                        Deals this week
                      </div>
                    </div>
                    <div>
                      <div
                        style={{
                          fontFamily: fonts.sans,
                          fontSize: 20,
                          fontWeight: 600,
                          color: colours.text,
                        }}
                      >
                        3
                      </div>
                      <div style={{ fontFamily: fonts.sans, fontSize: 11, color: colours.text3 }}>
                        Portfolio moves
                      </div>
                    </div>
                  </div>
                </div>
                <Link
                  to="/digest"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6,
                    fontFamily: fonts.sans,
                    fontSize: 13,
                    fontWeight: 500,
                    color: colours.brand,
                    textDecoration: 'none',
                    flexShrink: 0,
                    padding: '10px 18px',
                    background: colours.brandBg,
                    borderRadius: radius.sm,
                    border: `1px solid ${colours.brandBg}`,
                    whiteSpace: 'nowrap' as const,
                  }}
                >
                  Read Digest <ArrowRight size={14} />
                </Link>
              </div>
            )}
          </SurfaceCard>
        </section>

        {/* Opportunities snapshot */}
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
            Opportunities
          </div>
          <SurfaceCard style={{ padding: isMobile ? 20 : 28 }}>
            {matches.isLoading ? (
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
                    data-testid="lp-match-count"
                  >
                    {matchCount}
                  </div>
                  <div
                    style={{
                      fontFamily: fonts.sans,
                      fontSize: 13,
                      color: colours.text2,
                      marginTop: 4,
                    }}
                  >
                    {matchCount === 0
                      ? 'No new matches right now'
                      : `pending suggestion${matchCount !== 1 ? 's' : ''} curated for you`}
                  </div>
                </div>
                <Link
                  to="/matchmaking"
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
                  View opportunities <ArrowRight size={14} />
                </Link>
              </div>
            )}
          </SurfaceCard>
        </section>
      </div>
    </div>
  );
}
