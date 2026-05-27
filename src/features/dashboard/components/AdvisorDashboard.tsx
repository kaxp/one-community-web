import { Link } from 'react-router-dom';
import { Clock } from 'lucide-react';
import { useUser, useRole } from '@/auth/use-auth';
import { colours, fonts, radius, spacing } from '@/design-system/tokens';
import { SurfaceCard } from '@/design-system/components';
import { DashboardHero } from './DashboardHero';
import { QuickGrid } from './QuickGrid';
import { useIsMobile } from '@/lib/hooks/use-is-mobile';

export function AdvisorDashboard() {
  const user = useUser();
  const role = useRole();
  const isMobile = useIsMobile();

  return (
    <div style={{ background: colours.pageBg, minHeight: '100%' }} data-testid="advisor-dashboard">
      <DashboardHero
        name={user?.name ?? null}
        role={role ?? 'advisor'}
        contextLine="Welcome to One Community"
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

        {/* Coming soon notice */}
        <section>
          <SurfaceCard style={{ padding: isMobile ? 20 : 28 }}>
            <div style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
              <div
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: radius.sm,
                  background: colours.brandBg,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                <Clock size={18} color={colours.brand} aria-hidden />
              </div>
              <div>
                <div
                  style={{
                    fontFamily: fonts.sans,
                    fontSize: 15,
                    fontWeight: 600,
                    color: colours.text,
                    marginBottom: 4,
                  }}
                >
                  Advisor flows coming soon
                </div>
                <div
                  style={{
                    fontFamily: fonts.sans,
                    fontSize: 13,
                    color: colours.text2,
                    lineHeight: 1.55,
                  }}
                >
                  Your advisor-specific features are planned for a future release. In the meantime,
                  you can view your profile, manage your schedule, and respond to connection
                  requests from the sidebar.
                </div>
                <Link
                  to="/connections"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6,
                    fontFamily: fonts.sans,
                    fontSize: 12,
                    fontWeight: 500,
                    color: colours.brand,
                    textDecoration: 'none',
                    marginTop: 14,
                  }}
                >
                  Go to Network
                </Link>
              </div>
            </div>
          </SurfaceCard>
        </section>
      </div>
    </div>
  );
}
