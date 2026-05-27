import { format } from 'date-fns';
import type { UserRole } from '@/types/enums';
import { colours, fonts } from '@/design-system/tokens';
import { useIsMobile } from '@/lib/hooks/use-is-mobile';

const ROLE_LABELS: Record<UserRole, string> = {
  lp: 'LP',
  potential_lp: 'Potential LP',
  vc: 'VC',
  startup_inprogress: 'Startup',
  startup_onboarded: 'Startup',
  startup_funded: 'Portfolio Startup',
  partner: 'Partner',
  advisor: 'Advisor',
  admin: 'Admin',
  super_admin: 'Super Admin',
};

interface Props {
  name: string | null;
  role: UserRole;
  contextLine?: string;
}

export function DashboardHero({ name, role, contextLine }: Props) {
  const isMobile = useIsMobile();
  const greeting = getGreeting();
  const displayName = name?.split(' ')[0] ?? 'there';
  const today = format(new Date(), 'EEE, MMM d');

  return (
    <div
      style={{
        background: colours.dark,
        // RESPONSIVE: padding reduces on mobile
        padding: isMobile ? '28px 20px 24px' : '36px 40px 30px',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Subtle decorative circle */}
      <div
        aria-hidden
        style={{
          position: 'absolute',
          right: -60,
          top: -60,
          width: 220,
          height: 220,
          borderRadius: '50%',
          background: 'rgba(59,77,200,0.12)',
          pointerEvents: 'none',
        }}
      />

      <div
        style={{
          display: 'flex',
          alignItems: isMobile ? 'flex-start' : 'center',
          justifyContent: 'space-between',
          flexDirection: isMobile ? 'column' : 'row',
          gap: 8,
        }}
      >
        <div>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              marginBottom: 6,
              flexWrap: 'wrap',
            }}
          >
            <span
              style={{
                fontFamily: fonts.serif,
                fontSize: isMobile ? 22 : 26,
                fontWeight: 400,
                color: '#ffffff',
                letterSpacing: '-0.3px',
              }}
            >
              {greeting}, {displayName}
            </span>
            <span
              style={{
                background: 'rgba(59,77,200,0.35)',
                color: '#a5b4fc',
                fontSize: 10,
                fontWeight: 500,
                padding: '3px 10px',
                borderRadius: 9999,
                letterSpacing: '.06em',
                textTransform: 'uppercase' as const,
                fontFamily: fonts.sans,
                border: '1px solid rgba(165,180,252,0.2)',
              }}
            >
              {ROLE_LABELS[role]}
            </span>
          </div>
          {contextLine ? (
            <p
              style={{
                fontFamily: fonts.sans,
                fontSize: 13,
                color: 'rgba(255,255,255,0.55)',
                margin: 0,
              }}
            >
              {contextLine}
            </p>
          ) : null}
        </div>

        <div
          style={{
            fontFamily: fonts.sans,
            fontSize: 12,
            color: 'rgba(255,255,255,0.4)',
            flexShrink: 0,
            marginTop: isMobile ? 4 : 0,
          }}
        >
          {today}
        </div>
      </div>
    </div>
  );
}

function getGreeting(): string {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}
