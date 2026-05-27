import { useNavigate } from 'react-router-dom';
import {
  Search,
  Newspaper,
  Sparkles,
  Users,
  Clock,
  Landmark,
  FileText,
  BarChart3,
  UserPlus,
  Home,
  TrendingUp,
  Activity,
} from 'lucide-react';
import { colours, fonts, radius, shadow } from '@/design-system/tokens';
import { useIsMobile } from '@/lib/hooks/use-is-mobile';

const ICON_MAP = {
  search: Search,
  digest: Newspaper,
  matchmaking: Sparkles,
  connections: Users,
  pending: Clock,
  'portfolio-fund-deck': Landmark,
  pitch: FileText,
  mis: BarChart3,
  'add-user': UserPlus,
  dashboard: Home,
  analytics: TrendingUp,
  'lp-funnel': Activity,
} as const;

interface Tile {
  key: keyof typeof ICON_MAP;
  label: string;
  path: string;
  subtitle?: string;
}

interface Props {
  tiles: Tile[];
}

export function QuickGrid({ tiles }: Props) {
  const navigate = useNavigate();
  const isMobile = useIsMobile();

  return (
    <div
      style={{
        // RESPONSIVE: 2-col on mobile, 4-col on desktop
        display: 'grid',
        gridTemplateColumns: isMobile
          ? 'repeat(2, 1fr)'
          : `repeat(${Math.min(tiles.length, 4)}, 1fr)`,
        gap: isMobile ? 12 : 14,
      }}
    >
      {tiles.map((tile) => (
        <QuickTile key={tile.key} tile={tile} onNavigate={() => navigate(tile.path)} />
      ))}
    </div>
  );
}

function QuickTile({ tile, onNavigate }: { tile: Tile; onNavigate: () => void }) {
  const isMobile = useIsMobile();
  const Icon = ICON_MAP[tile.key];
  const [hovered, setHovered] = React.useState(false);

  return (
    <button
      onClick={onNavigate}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      aria-label={tile.label}
      style={{
        background: colours.surface,
        border: `1px solid ${colours.border}`,
        borderRadius: radius.md,
        // RESPONSIVE: padding reduces on mobile
        padding: isMobile ? '16px 14px' : '20px 18px',
        textAlign: 'left',
        cursor: 'pointer',
        boxShadow: hovered ? shadow.cardHover : shadow.card,
        transform: hovered ? 'translateY(-2px)' : 'translateY(0)',
        transition: 'box-shadow 0.18s ease, transform 0.18s ease',
        display: 'flex',
        flexDirection: 'column',
        gap: 10,
      }}
    >
      <div
        style={{
          width: 36,
          height: 36,
          borderRadius: radius.sm,
          background: colours.brandBg,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
        }}
      >
        <Icon size={18} color={colours.brand} strokeWidth={1.75} aria-hidden />
      </div>
      <div>
        <div
          style={{
            fontFamily: fonts.sans,
            fontSize: isMobile ? 13 : 14,
            fontWeight: 500,
            color: colours.text,
            marginBottom: 2,
          }}
        >
          {tile.label}
        </div>
        {tile.subtitle ? (
          <div
            style={{
              fontFamily: fonts.sans,
              fontSize: 11,
              color: colours.text3,
            }}
          >
            {tile.subtitle}
          </div>
        ) : null}
      </div>
    </button>
  );
}

// React needs to be in scope for useState
import React from 'react';
