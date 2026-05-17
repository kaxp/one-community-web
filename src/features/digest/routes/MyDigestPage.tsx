import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, ChevronDown, ChevronUp, ExternalLink, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { can } from '@/lib/role-capabilities';
import { useUser } from '@/auth/use-auth';

// ── Inject editorial fonts + keyframe animations once ──────────────────────

const DIGEST_CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=DM+Sans:opsz,wght@9..40,300;9..40,400;9..40,500&display=swap');

  @keyframes wv-cta-glow {
    0%,100% { box-shadow: 0 4px 20px rgba(255,255,255,0.12); }
    50%      { box-shadow: 0 4px 32px rgba(255,255,255,0.32), 0 0 0 5px rgba(255,255,255,0.06); }
  }
  @keyframes wv-live-pulse {
    0%,100% { opacity: 1; transform: scale(1); }
    50%      { opacity: 0.55; transform: scale(0.82); }
  }
  .wv-cta-btn  { animation: wv-cta-glow 2.8s ease-in-out infinite; }
  .wv-live-dot { animation: wv-live-pulse 2s ease-in-out infinite; }
`;

function useDigestStyles() {
  useEffect(() => {
    const id = 'warmup-digest-css';
    if (!document.getElementById(id)) {
      const el = document.createElement('style');
      el.id = id;
      el.textContent = DIGEST_CSS;
      document.head.appendChild(el);
    }
  }, []);
}

// ── Design tokens ──────────────────────────────────────────────────────────

const T = {
  serif: "'Instrument Serif', Georgia, serif",
  sans: "'DM Sans', system-ui, sans-serif",
  dark: '#0F1923',
  text: '#1a1a1a',
  text2: '#6b6b6b',
  text3: '#9a9a9a',
  border: 'rgba(0,0,0,0.08)',
  border2: 'rgba(0,0,0,0.12)',
  purple: '#6d28d9',
  purpleBg: '#ede9fe',
  purpleText: '#5b21b6',
  green: '#15803d',
  greenBg: '#dcfce7',
  amber: '#b45309',
  amberBg: '#fef3c7',
  blue: '#1d4ed8',
  blueBg: '#dbeafe',
  pageBg: '#F8F7F4',
  surface: '#ffffff',
} as const;

// ── Data — verified and production-accurate ────────────────────────────────

const SECTORS = [
  { label: 'SpaceTech', pct: 86, dir: 'up', val: '+42%' },
  { label: 'AgriTech', pct: 66, dir: 'up', val: '+28%' },
  { label: 'Fintech', pct: 50, dir: 'up', val: '+21%' },
  { label: 'D2C', pct: 20, dir: 'down', val: '+8%' },
  { label: 'SaaS', pct: 6, dir: 'down', val: '−3%' },
];

const PORTFOLIO = [
  {
    name: 'Boba Bhai',
    sector: 'Quick Service Restaurant · D2C · Consumer',
    badge: 'Series A+ Closed ✓',
    badgeColor: T.green,
    badgeBg: T.greenBg,
    amount: '₹40 Cr',
    metrics: [
      ['Round', 'Series A+'],
      ['Lead', '8i Ventures · Titan Capital · GGC'],
      ['FY25 Revenue', '₹30 Cr  ·  500% YoY growth'],
      ['Outlets', '92+ across 8 cities'],
      ['FY26 Target', '~₹75 Cr (2.5× FY25)'],
      ['Expansion', '300 stores in 12–14 months'],
    ],
    pov: 'Boba Bhai is capturing the Gen Z premium QSR opportunity ahead of incumbents. 500% YoY revenue growth to ₹30 Cr in FY25, combined with 92+ outlets in 8 cities, signals disciplined omnichannel execution. Existing investors doubling down at a 5× valuation step-up is the strongest possible endorsement.',
    tags: [
      { l: 'D2C', c: T.purple, bg: T.purpleBg },
      { l: 'Consumer', c: T.green, bg: T.greenBg },
      { l: 'IPO Signal', c: T.blue, bg: T.blueBg },
    ],
    url: 'https://inc42.com/buzz/boba-bhai-nets-%E2%82%B940-cr-to-expand-offline-presence/',
    wide: true,
  },
  {
    name: 'Balwaan Krishi',
    sector: 'AgriTech · Farm Machinery',
    badge: 'Nationwide Expansion',
    badgeColor: T.amber,
    badgeBg: T.amberBg,
    amount: '₹87.9 Cr',
    metrics: [
      ['Revenue FY25', '₹87.9 Cr'],
      ['New Hub', 'Jaipur Manufacturing'],
      ['Warehouses', 'MP · AP · TN · NE · Kashmir'],
      ['Jobs Created', '500+'],
      ['Farmers Served', '50 lakh+'],
      ['Units Sold', '60,000+ equipment'],
    ],
    pov: "Distribution density is Balwaan's deepest moat. Reaching tehsil-level with 2,000+ dealers is something no VC-backed agri brand has replicated at scale. The Jaipur manufacturing hub signals a move from distribution-first to vertically integrated — a significant strategic shift.",
    tags: [
      { l: 'AgriTech', c: T.green, bg: T.greenBg },
      { l: 'Expansion', c: T.amber, bg: T.amberBg },
    ],
    url: 'https://www.global-agriculture.com/mechanization-technology/balwaan-krishi-expands-manufacturing-and-distribution-network-in-india/',
    wide: false,
  },
  {
    name: 'Olee Space',
    sector: 'Defense · Photonics · SpaceTech',
    badge: 'Seed Raised ✓',
    badgeColor: T.blue,
    badgeBg: T.blueBg,
    amount: '$3 M',
    metrics: [
      ['Lead', 'Rockstud Capital'],
      ['Core Tech', 'FSOC · Quantum KD · DEW'],
      ['Speed', '10+ Gbps · <10ms latency'],
      ['Indigenous', '85% content validated'],
      ['Founders', 'IIT Bombay'],
      ['Use of Funds', '80% hardware · 20% opex'],
    ],
    pov: "The FSOC + QKD + DEW stack is technically 3–5 years ahead of domestic competition. 85% indigenous content validated under Indian atmospheric conditions in just 4 months is exceptional. This is the rare seed where the technology moat is genuinely defensible — and squarely aligned with India's Atmanirbhar Bharat defense push.",
    tags: [
      { l: 'SpaceTech', c: T.blue, bg: T.blueBg },
      { l: 'Deep Tech', c: T.purple, bg: T.purpleBg },
      { l: 'High Conviction', c: T.green, bg: T.greenBg },
    ],
    url: 'https://indianstartupnews.com/funding/olee-space-raises-3-million-to-advance-laser-based-quantum-communications-and-directed-energy-weapon-systems-9659808',
    wide: false,
  },
];

const NEWS = [
  {
    title: 'Scripbox plans ₹170 Cr debt and equity raise; gears up for IPO',
    body: "The wealth management platform is structuring a blended debt + equity round to strengthen its balance sheet ahead of a potential public listing — the first IPO-intent signal from India's digital wealthtech tier.",
    signal: "First IPO-intent signal from India's digital wealthtech in 2026.",
    tags: ['Fintech', 'IPO Signal'],
    url: 'https://entrackr.com/exclusive/exclusive-scripbox-plans-rs-170-cr-debt-and-equity-raise-gears-up-for-ipo-11836622',
  },
  {
    title: 'Centricity in talks to raise $30 Mn led by MUFG and SIG',
    body: 'The corporate health platform is attracting marquee institutional capital — a rare cross-border vote of confidence in Indian enterprise wellness SaaS. MUFG and SIG co-leading signals deep institutional conviction.',
    signal: 'Cross-border institutional interest in B2B wellness accelerating.',
    tags: ['Healthtech', 'B2B SaaS'],
    url: 'https://entrackr.com/exclusive/exclusive-centricity-in-talks-to-raise-30-mn-round-led-by-mufg-and-sig-11822996',
  },
  {
    title: 'BazaarNow set to raise ~$8 Mn led by Peak XV',
    body: "The rural B2B commerce platform lands Peak XV backing — validating that Tier 3+ distribution is the next frontier for organised commerce infrastructure. Peak XV's entry signals a category-conviction shift.",
    signal: 'Peak XV validating rural commerce — a category conviction shift.',
    tags: ['Commerce', 'Rural'],
    url: 'https://entrackr.com/exclusive/exclusive-bazaarnow-set-to-raise-around-8-mn-led-by-peak-xv-11804453',
  },
  {
    title: 'Blue Tokai to raise ₹175 Cr in its extended Series D round',
    body: "India's premium coffee brand extends its growth round, doubling down on specialty café expansion. This validates premiumisation in consumer F&B as durable — not cyclical — with unit economics that hold even in a tighter market.",
    signal:
      "India's premium beverage consumer is far more sophisticated than traditional data showed.",
    tags: ['D2C', 'Consumer'],
    url: 'https://entrackr.com/exclusive/exclusive-blue-tokai-to-raise-rs-175-cr-in-its-extended-series-d-round-11797068',
  },
  {
    title: 'Shadowfax to add 85 dark stores, expand network to 100 in FY27',
    body: 'The logistics-tech player is transforming into a quick-commerce infrastructure provider — a category pivot that could redefine its TAM from delivery-as-a-service to dark-store-as-a-platform.',
    signal: 'Structural bet on 10-minute delivery becoming ubiquitous infrastructure.',
    tags: ['Logistics', 'Q-Commerce'],
    url: 'https://inc42.com/buzz/shadowfax-to-add-85-dark-stores-expand-network-to-100-in-fy27/',
  },
  {
    title: 'Natural Sweetener Brand The Sweet Change raises from IAN Angel Fund',
    body: "IAN Angel Fund backs the natural sweetener startup — one of the first institutional bets in India's functional food category, signalling growing LP interest in health-conscious consumer brands beyond premium beverages.",
    signal: 'Angel capital entering functional food — precursor to institutional follow-on.',
    tags: ['Consumer', 'FoodTech'],
    url: 'https://indianstartupnews.com/funding/natural-sweetener-brand-the-sweet-change-raises-funding-from-ian-angel-fund-11834351',
  },
  {
    title:
      "Dhruva Space secures ₹105 Cr from Indian govt for 'Project Garud' satellite manufacturing",
    body: "Government-backed capital flowing into private satellite manufacturing marks a policy inflection — India building domestic space supply chains at speed. Dhruva Space becomes a key node in India's sovereign space ambition.",
    signal: 'Govt capital + private execution = fastest path to sovereign space capability.',
    tags: ['SpaceTech', 'Govt-Backed'],
    url: 'https://indianstartupnews.com/news/dhruva-space-secures-rs-105-crore-from-indian-govt-for-project-garud-satellite-manufacturing-11834043',
  },
];

const ARCHIVE = [
  {
    id: '46',
    sector: 'Healthtech',
    sectorColor: '#0f6e56',
    issue: 'Issue 46',
    date: 'May 09, 2026',
    signals: [
      'AI diagnostics funding surged — 3 rounds tracked',
      'Apollo partnership wave emerging across diagnostic labs',
      'Centricity begins talks with Japanese institutional capital',
    ],
    signalCount: 4,
    portfolioCount: 2,
    sentiment: { label: 'High Conviction', color: T.green, bg: T.greenBg },
    tags: ['healthtech', 'fintech'],
    headline: "India's healthtech consolidation is entering its most decisive phase.",
  },
  {
    id: '45',
    sector: 'Fintech',
    sectorColor: '#185fa5',
    issue: 'Issue 45',
    date: 'May 02, 2026',
    signals: [
      'Payments war heating — PhonePe vs CRED vs Juspay',
      'Neo-banking licenses signal RBI softening stance',
      'Scripbox IPO preparations begin quietly',
    ],
    signalCount: 6,
    portfolioCount: 1,
    sentiment: { label: 'Stable', color: T.blue, bg: T.blueBg },
    tags: ['fintech', 'd2c'],
    headline: 'The fintech battleground is consolidating faster than anyone predicted.',
  },
  {
    id: '44',
    sector: 'Consumer',
    sectorColor: '#854f0b',
    issue: 'Issue 44',
    date: 'Apr 25, 2026',
    signals: [
      'D2C premium cycle confirmed — Blue Tokai, Boba Bhai, Bombay Shaving',
      'Quick commerce hitting unit economics wall in Tier 1',
      'Rural distribution emerging as the next battleground',
    ],
    signalCount: 3,
    portfolioCount: 5,
    sentiment: { label: 'Watchlist', color: T.amber, bg: T.amberBg },
    tags: ['d2c', 'agritech'],
    headline:
      'The premium consumer cycle is real — but unit economics discipline separates winners.',
  },
  {
    id: '43',
    sector: 'Deep Tech',
    sectorColor: '#3c3489',
    issue: 'Issue 43',
    date: 'Apr 18, 2026',
    signals: [
      "India's defense-tech startup pipeline deepens significantly",
      '3 space startups in stealth raising pre-seed capital',
      'IIT founders dominating deep-tech founding teams',
    ],
    signalCount: 5,
    portfolioCount: 3,
    sentiment: { label: 'High Conviction', color: T.purpleText, bg: T.purpleBg },
    tags: ['spacetech', 'agritech'],
    headline: "India's sovereign technology decade is beginning — and Warmup is early.",
  },
  {
    id: '42',
    sector: 'SaaS',
    sectorColor: '#185fa5',
    issue: 'Issue 42',
    date: 'Apr 11, 2026',
    signals: [
      'Vertical SaaS outperforming horizontal peers by 2.3× on NRR',
      'AI-native CRMs beginning to displace traditional tools',
      'India SaaS companies at $1M ARR closing 40% faster',
    ],
    signalCount: 4,
    portfolioCount: 2,
    sentiment: { label: 'Stable', color: T.blue, bg: T.blueBg },
    tags: ['fintech', 'd2c'],
    headline:
      'The SaaS discipline era has arrived — generalists are losing, specialists are compounding.',
  },
  {
    id: '41',
    sector: 'AgriTech',
    sectorColor: '#3b6d11',
    issue: 'Issue 41',
    date: 'Apr 04, 2026',
    signals: [
      'Farm machinery digitisation accelerating in Tier 2 India',
      'Balwaan Krishi FY25 revenue clears ₹80 Cr milestone',
      'Government PLI scheme benefiting agri-hardware startups',
    ],
    signalCount: 3,
    portfolioCount: 4,
    sentiment: { label: 'High Conviction', color: T.green, bg: T.greenBg },
    tags: ['agritech', 'd2c'],
    headline: "India's farm machinery moment is a decade in the making — and just getting started.",
  },
];

type ArchiveEdition = (typeof ARCHIVE)[0];

// ── Small shared components ────────────────────────────────────────────────

function Tag({ label, color, bg }: { label: string; color: string; bg: string }) {
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        fontSize: 10,
        fontWeight: 500,
        padding: '3px 10px',
        borderRadius: 100,
        letterSpacing: '.04em',
        textTransform: 'uppercase',
        background: bg,
        color,
      }}
    >
      {label}
    </span>
  );
}

function MomentumBar({
  sector,
  pct,
  dir,
  val,
}: {
  sector: string;
  pct: number;
  dir: string;
  val: string;
}) {
  const barColor = dir === 'up' ? '#4ade80' : '#fb923c';
  const valColor = dir === 'up' ? '#4ade80' : '#f97316';
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10 }}>
      <div style={{ width: 80, fontSize: 12, color: 'rgba(255,255,255,0.6)', flexShrink: 0 }}>
        {sector}
      </div>
      <div
        style={{
          flex: 1,
          height: 3,
          background: 'rgba(255,255,255,0.08)',
          borderRadius: 2,
          overflow: 'hidden',
        }}
      >
        <div style={{ height: '100%', width: `${pct}%`, background: barColor, borderRadius: 2 }} />
      </div>
      <div
        style={{
          fontSize: 12,
          fontWeight: 500,
          color: valColor,
          width: 44,
          textAlign: 'right',
          flexShrink: 0,
        }}
      >
        {val}
      </div>
    </div>
  );
}

// ── SECTION 1: Hero ────────────────────────────────────────────────────────

function HeroSection({ isOpen, onToggle }: { isOpen: boolean; onToggle: () => void }) {
  return (
    <div
      style={{
        background: T.dark,
        padding: '52px 40px 44px',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Subtle glow orb */}
      <div
        style={{
          position: 'absolute',
          top: -120,
          right: -80,
          width: 480,
          height: 480,
          borderRadius: '50%',
          background: 'rgba(109,40,217,0.05)',
          pointerEvents: 'none',
        }}
      />

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 320px',
          gap: 56,
          maxWidth: 1060,
          position: 'relative',
        }}
      >
        {/* Left */}
        <div>
          <div
            style={{
              fontSize: 10,
              fontWeight: 500,
              letterSpacing: '.14em',
              textTransform: 'uppercase',
              color: 'rgba(255,255,255,0.4)',
              marginBottom: 16,
            }}
          >
            Week 47 · May 17, 2026 · Issue #47
          </div>
          <h1
            style={{
              fontFamily: T.serif,
              fontSize: 34,
              lineHeight: 1.18,
              color: '#fff',
              marginBottom: 28,
              fontWeight: 400,
              letterSpacing: '-.3px',
            }}
          >
            Defense-tech sovereignty and premium consumer growth led ₹830 Cr in capital activity
            this week.
          </h1>
          <div style={{ display: 'flex', gap: 32, marginBottom: 32, flexWrap: 'wrap' }}>
            {[
              { val: '₹830 Cr', label: 'Capital tracked' },
              { val: '7', label: 'Ecosystem rounds' },
              { val: '3', label: 'Portfolio milestones' },
              { val: 'SpaceTech ↑', label: 'Sector of week' },
            ].map(({ val, label }) => (
              <div key={label}>
                <div
                  style={{
                    fontSize: 22,
                    fontWeight: 300,
                    color: '#fff',
                    letterSpacing: -1,
                    lineHeight: 1,
                  }}
                >
                  {val}
                </div>
                <div
                  style={{
                    fontSize: 11,
                    color: 'rgba(255,255,255,0.4)',
                    marginTop: 4,
                    letterSpacing: '.04em',
                  }}
                >
                  {label}
                </div>
              </div>
            ))}
          </div>

          {/* Highlighted CTA */}
          <button
            className="wv-cta-btn"
            onClick={onToggle}
            style={{
              background: 'rgba(255,255,255,0.95)',
              color: T.purpleText,
              border: 'none',
              borderRadius: 10,
              padding: '13px 26px',
              fontFamily: T.sans,
              fontSize: 14,
              fontWeight: 600,
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 10,
              letterSpacing: '.01em',
            }}
          >
            {isOpen ? (
              <>
                Collapse digest <ChevronUp size={16} />
              </>
            ) : (
              <>
                Read Full Digest <ChevronDown size={16} />
              </>
            )}
          </button>
          {!isOpen && (
            <p
              style={{
                color: 'rgba(255,255,255,0.35)',
                fontSize: 11,
                marginTop: 10,
                letterSpacing: '.03em',
              }}
            >
              Portfolio · News · Tool · Industry · Warmup&apos;s View
            </p>
          )}
        </div>

        {/* Right — sector momentum */}
        <div>
          <div
            style={{
              fontSize: 10,
              fontWeight: 500,
              letterSpacing: '.1em',
              textTransform: 'uppercase',
              color: 'rgba(255,255,255,0.3)',
              marginBottom: 16,
            }}
          >
            Sector momentum
          </div>
          {SECTORS.map((s) => (
            <MomentumBar key={s.label} sector={s.label} pct={s.pct} dir={s.dir} val={s.val} />
          ))}
        </div>
      </div>
    </div>
  );
}

// ── SECTION 2: Full Digest (inline expand) ─────────────────────────────────

const TABS = ['Portfolio', 'Startup News', 'Tool of Month', "Warmup's View"] as const;

function PortfolioTab() {
  return (
    <div>
      <div
        style={{
          fontSize: 10,
          fontWeight: 500,
          letterSpacing: '.12em',
          textTransform: 'uppercase',
          color: T.text3,
          marginBottom: 8,
        }}
      >
        Portfolio Intelligence
      </div>
      <div style={{ fontFamily: T.serif, fontSize: 24, fontWeight: 400, marginBottom: 24 }}>
        Portfolio Momentum
      </div>

      {PORTFOLIO.map((co) => (
        <div
          key={co.name}
          style={{
            background: T.surface,
            border: `1px solid ${T.border}`,
            borderRadius: 12,
            overflow: 'hidden',
            marginBottom: 16,
          }}
        >
          {/* Card head */}
          <div
            style={{
              padding: '20px 24px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'flex-start',
              borderBottom: `1px solid ${T.border}`,
            }}
          >
            <div>
              <div style={{ fontSize: 16, fontWeight: 500, marginBottom: 2 }}>{co.name}</div>
              <div
                style={{
                  fontSize: 11,
                  color: T.text3,
                  letterSpacing: '.05em',
                  textTransform: 'uppercase',
                }}
              >
                {co.sector}
              </div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <span
                style={{
                  display: 'inline-block',
                  fontSize: 10,
                  fontWeight: 500,
                  padding: '3px 10px',
                  borderRadius: 100,
                  letterSpacing: '.04em',
                  textTransform: 'uppercase',
                  background: co.badgeBg,
                  color: co.badgeColor,
                  marginBottom: 6,
                }}
              >
                {co.badge}
              </span>
              <div style={{ fontSize: 22, fontWeight: 300, letterSpacing: -1 }}>{co.amount}</div>
            </div>
          </div>

          {/* Card body */}
          <div style={{ padding: '20px 24px' }}>
            <div
              style={{ display: 'grid', gridTemplateColumns: co.wide ? '1fr 1fr' : '1fr', gap: 24 }}
            >
              <table style={{ width: '100%', fontSize: 13, borderCollapse: 'collapse' }}>
                <tbody>
                  {co.metrics.map(([label, value]) => (
                    <tr key={label} style={{ borderBottom: `1px solid ${T.border}` }}>
                      <td
                        style={{
                          padding: '8px 0',
                          color: T.text3,
                          fontSize: 11,
                          textTransform: 'uppercase',
                          letterSpacing: '.05em',
                          width: 130,
                        }}
                      >
                        {label}
                      </td>
                      <td style={{ padding: '8px 0', fontWeight: 500, textAlign: 'right' }}>
                        {value}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div
                style={{
                  background: '#faf9ff',
                  borderRadius: 8,
                  borderLeft: `3px solid ${T.purple}`,
                  padding: '14px 16px',
                }}
              >
                <div
                  style={{
                    fontSize: 10,
                    fontWeight: 500,
                    letterSpacing: '.1em',
                    textTransform: 'uppercase',
                    color: T.purple,
                    marginBottom: 6,
                  }}
                >
                  Warmup POV
                </div>
                <div style={{ fontSize: 13, lineHeight: 1.65, color: T.text2 }}>{co.pov}</div>
              </div>
            </div>
            <div
              style={{
                display: 'flex',
                gap: 6,
                flexWrap: 'wrap',
                marginTop: 14,
                alignItems: 'center',
              }}
            >
              {co.tags.map((t) => (
                <Tag key={t.l} label={t.l} color={t.c} bg={t.bg} />
              ))}
              <a
                href={co.url}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  marginLeft: 'auto',
                  fontSize: 12,
                  fontWeight: 500,
                  color: T.purple,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 4,
                  textDecoration: 'none',
                }}
              >
                Source <ExternalLink size={11} />
              </a>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function NewsTab() {
  return (
    <div>
      <div
        style={{
          fontSize: 10,
          fontWeight: 500,
          letterSpacing: '.12em',
          textTransform: 'uppercase',
          color: T.text3,
          marginBottom: 8,
        }}
      >
        Ecosystem Intelligence
      </div>
      <div style={{ fontFamily: T.serif, fontSize: 24, fontWeight: 400, marginBottom: 24 }}>
        Startup News
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        {NEWS.map((n) => (
          <div
            key={n.title}
            style={{
              padding: 16,
              borderRadius: 10,
              border: `1px solid ${T.border}`,
              background: T.surface,
            }}
          >
            <a
              href={n.url}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                fontFamily: T.sans,
                fontSize: 13,
                fontWeight: 500,
                lineHeight: 1.4,
                marginBottom: 6,
                display: 'block',
                color: T.text,
                textDecoration: 'none',
              }}
              onMouseOver={(e) => {
                (e.currentTarget as HTMLAnchorElement).style.color = T.purple;
              }}
              onMouseOut={(e) => {
                (e.currentTarget as HTMLAnchorElement).style.color = T.text;
              }}
            >
              {n.title}{' '}
              <ExternalLink
                size={10}
                style={{ display: 'inline', verticalAlign: 'middle', opacity: 0.5 }}
              />
            </a>
            <div style={{ fontSize: 12, color: T.text2, lineHeight: 1.55, marginBottom: 8 }}>
              {n.body}
            </div>
            <div style={{ fontSize: 11, color: T.text3, fontWeight: 500, marginBottom: 8 }}>
              {n.signal}
            </div>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {n.tags.map((tag) => (
                <Tag key={tag} label={tag} color={T.text2} bg={T.pageBg} />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function ToolTab() {
  return (
    <div>
      <div
        style={{
          fontSize: 10,
          fontWeight: 500,
          letterSpacing: '.12em',
          textTransform: 'uppercase',
          color: T.text3,
          marginBottom: 8,
        }}
      >
        Operator Recommendation
      </div>
      <div style={{ fontFamily: T.serif, fontSize: 24, fontWeight: 400, marginBottom: 24 }}>
        Tool of the Month
      </div>
      <div style={{ background: T.pageBg, borderRadius: 12, padding: 24 }}>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            marginBottom: 8,
          }}
        >
          <div>
            <div style={{ fontSize: 20, fontWeight: 500, marginBottom: 4 }}>Nitro Commerce</div>
            <div style={{ fontSize: 13, color: T.text2, marginBottom: 12 }}>
              AI-driven first-party data & growth platform for D2C brands ·{' '}
              <a
                href="https://yourstory.com/2026/01/nitro-commerce-raises-series-a-round-led-by-cornerstone-ventures"
                target="_blank"
                rel="noopener noreferrer"
                style={{ color: T.purple, textDecoration: 'none', fontWeight: 500 }}
              >
                Series A · $5 M · Jan 2026
              </a>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 6 }}>
            <Tag label="D2C AI" color={T.purpleText} bg={T.purpleBg} />
          </div>
        </div>

        <p style={{ fontSize: 13, color: T.text2, lineHeight: 1.65, marginBottom: 16 }}>
          Nitro Commerce solves the identity gap killing D2C brands: up to 90% of website visitors
          are anonymous. Its cookieless, AI-powered platform de-anonymises high-intent visitors,
          enables first-party retargeting across a 120M shopping-profile database, and builds
          merchant network effects — without Meta or Google dependency. Founded by Umair Mohammad,
          Shamail Tayyab, and Pratik Anand (2023). $5 M ARR, 10× growth in 12 months, 2,500+ brands
          including Rare Rabbit, Dot & Key, Pepperfry.
        </p>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3,1fr)',
            gap: 10,
            marginBottom: 16,
          }}
        >
          {[
            ['Core capability', 'Cookieless identity resolution for anonymous D2C visitors'],
            ['Network effect', 'Cross-brand identity graph — more merchants = better data for all'],
            [
              'Recent move',
              'Nitro Pulse (LLM-based, piloted with 10 clients) + Cornerstone Ventures-led Series A',
            ],
          ].map(([label, val]) => (
            <div key={label} style={{ background: T.surface, borderRadius: 8, padding: 14 }}>
              <div
                style={{
                  fontSize: 10,
                  fontWeight: 500,
                  textTransform: 'uppercase',
                  letterSpacing: '.08em',
                  color: T.text3,
                  marginBottom: 4,
                }}
              >
                {label}
              </div>
              <div style={{ fontSize: 13, lineHeight: 1.4 }}>{val}</div>
            </div>
          ))}
        </div>

        <div
          style={{
            background: '#faf9ff',
            borderRadius: 8,
            borderLeft: `3px solid ${T.purple}`,
            padding: '14px 16px',
          }}
        >
          <div
            style={{
              fontSize: 10,
              fontWeight: 500,
              letterSpacing: '.1em',
              textTransform: 'uppercase',
              color: T.purple,
              marginBottom: 6,
            }}
          >
            Why Warmup Likes This
          </div>
          <div style={{ fontSize: 13, lineHeight: 1.65, color: T.text2 }}>
            Nitro&apos;s network-effect model — where each merchant makes the identity graph smarter
            for all — is a genuine competitive moat. Led by Umair Mohammad, whose prior company
            Wigzo was acquired by Shiprocket, this team has already built and sold in this exact
            space. Razorpay Ventures participating in the round is an additional signal of
            payment-ecosystem alignment.
          </div>
        </div>
      </div>
    </div>
  );
}

function WarmupViewTab() {
  const theses = [
    {
      title: "AI-native infrastructure is India's biggest near-term opportunity",
      badge: { l: 'High Conviction', c: T.purpleText, bg: T.purpleBg },
      body: 'Warmup Fund II (₹300 Cr corpus) is actively sourcing observability tools, fine-tuning infrastructure, data-labelling platforms, and AI-native vertical SaaS. The Indian market gives founders a 30–40% cost advantage in building AI-powered products — and a massive captive market to iterate in before going global.',
    },
    {
      title: 'D2C 2.0: profitability-first brands will dominate',
      badge: { l: 'High Conviction', c: T.green, bg: T.greenBg },
      body: 'The Boba Bhai playbook — high repeat, strong community, disciplined unit economics before raising institutional rounds — is the right template. The next category winners will be built by founders who understood margins before they understood GMV. Premium + discipline = durable.',
    },
    {
      title: 'Generalist SaaS is overcrowded — vertical AI wins now',
      badge: { l: 'Caution', c: T.amber, bg: T.amberBg },
      body: "India's horizontal SaaS is getting compressed from both ends. AI-native tools are automating workflows entire product lines once owned. Our view: dominate one vertical, one workflow, one persona. Depth beats breadth in 2026. NRR is the only metric that matters at Series A and beyond.",
    },
  ];

  const predictions = [
    ['Warmup prediction', '2 portfolio companies reach ₹100 Cr ARR by FY27'],
    ['Sector watch', 'AgriTech distribution consolidation accelerates H2 2026'],
    ['Macro view', "India's consumer tech IPO window reopens Q3 2026"],
    ['Founder advice', 'Default alive > default fundable. Prove the model, then raise.'],
  ];

  return (
    <div>
      <div
        style={{
          fontSize: 10,
          fontWeight: 500,
          letterSpacing: '.12em',
          textTransform: 'uppercase',
          color: T.text3,
          marginBottom: 8,
        }}
      >
        Internal VC Intelligence
      </div>
      <div style={{ fontFamily: T.serif, fontSize: 24, fontWeight: 400, marginBottom: 24 }}>
        Warmup&apos;s Industry View
      </div>

      {theses.map((th) => (
        <div
          key={th.title}
          style={{
            border: `1px solid ${T.border}`,
            borderRadius: 12,
            padding: 20,
            marginBottom: 12,
            background: T.surface,
          }}
        >
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'flex-start',
              gap: 12,
              marginBottom: 8,
            }}
          >
            <div style={{ fontSize: 14, fontWeight: 500 }}>{th.title}</div>
            <Tag label={th.badge.l} color={th.badge.c} bg={th.badge.bg} />
          </div>
          <div style={{ fontSize: 13, color: T.text2, lineHeight: 1.6 }}>{th.body}</div>
        </div>
      ))}

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: 10,
          marginTop: 16,
          marginBottom: 16,
        }}
      >
        {predictions.map(([label, text]) => (
          <div key={label} style={{ background: T.pageBg, borderRadius: 8, padding: 14 }}>
            <div
              style={{
                fontSize: 10,
                fontWeight: 500,
                textTransform: 'uppercase',
                letterSpacing: '.08em',
                color: T.text3,
                marginBottom: 4,
              }}
            >
              {label}
            </div>
            <div style={{ fontSize: 13, fontWeight: 500 }}>{text}</div>
          </div>
        ))}
      </div>

      <div style={{ background: T.pageBg, borderRadius: 12, padding: 24 }}>
        <div
          style={{
            fontFamily: T.serif,
            fontSize: 16,
            fontStyle: 'italic',
            lineHeight: 1.6,
            color: T.text,
            marginBottom: 12,
          }}
        >
          &ldquo;What started as a group of founders investing in promising startups has evolved
          into a structured thesis-driven fund. We&apos;re entering a period where bold founders
          building cutting-edge technology will define the next decade of Indian innovation — and
          we&apos;re backing that conviction with ₹300 Cr in Fund II.&rdquo;
        </div>
        <div
          style={{
            fontSize: 11,
            color: T.text3,
            textTransform: 'uppercase',
            letterSpacing: '.06em',
          }}
        >
          Sharad Bansal · Founding & Managing Partner · Warmup Ventures ·{' '}
          <a
            href="https://www.linkedin.com/in/shrdbnsl/"
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: T.purple, textDecoration: 'none' }}
          >
            LinkedIn ↗
          </a>
        </div>
      </div>
    </div>
  );
}

function FullDigestSection({
  activeTab,
  setActiveTab,
  onCollapse,
}: {
  activeTab: number;
  setActiveTab: (i: number) => void;
  onCollapse: () => void;
}) {
  return (
    <div style={{ background: T.surface, borderTop: `1px solid ${T.border}` }}>
      {/* Sticky tab nav */}
      <div
        style={{
          display: 'flex',
          gap: 0,
          borderBottom: `1px solid ${T.border}`,
          overflowX: 'auto',
          scrollbarWidth: 'none',
          position: 'sticky',
          top: 0,
          background: T.surface,
          zIndex: 10,
        }}
      >
        {TABS.map((tab, i) => (
          <button
            key={tab}
            onClick={() => setActiveTab(i)}
            style={{
              padding: '14px 20px',
              fontSize: 11,
              fontWeight: 500,
              letterSpacing: '.08em',
              textTransform: 'uppercase',
              color: activeTab === i ? T.text : T.text3,
              cursor: 'pointer',
              whiteSpace: 'nowrap',
              background: 'transparent',
              border: 'none',
              borderBottom: activeTab === i ? `2px solid ${T.text}` : '2px solid transparent',
              fontFamily: T.sans,
            }}
          >
            {tab}
          </button>
        ))}
      </div>

      <div style={{ padding: '40px 40px' }}>
        {activeTab === 0 && <PortfolioTab />}
        {activeTab === 1 && <NewsTab />}
        {activeTab === 2 && <ToolTab />}
        {activeTab === 3 && <WarmupViewTab />}
      </div>

      <div
        style={{
          padding: '16px 40px',
          borderTop: `1px solid ${T.border}`,
          display: 'flex',
          justifyContent: 'center',
        }}
      >
        <button
          onClick={onCollapse}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            fontSize: 12,
            fontWeight: 500,
            color: T.text2,
            cursor: 'pointer',
            padding: '8px 16px',
            borderRadius: 8,
            border: `1px solid ${T.border}`,
            background: T.surface,
            fontFamily: T.sans,
          }}
        >
          <ChevronUp size={14} /> Collapse digest
        </button>
      </div>
    </div>
  );
}

// ── SECTION 3: Featured this week — bento ─────────────────────────────────

const SIGNALS = [
  {
    dot: '#22c55e',
    text: 'Scripbox IPO intent — first wealthtech IPO signal of 2026',
    tag: 'Fintech',
  },
  {
    dot: '#f59e0b',
    text: 'Shadowfax pivoting to dark-store infrastructure play',
    tag: 'Logistics',
  },
  {
    dot: '#3b82f6',
    text: 'Dhruva Space ₹105 Cr govt satellite manufacturing mandate',
    tag: 'SpaceTech',
  },
  { dot: '#22c55e', text: "MUFG + SIG entering India's enterprise health SaaS", tag: 'Healthtech' },
  { dot: '#a855f7', text: 'Peak XV validating rural B2B commerce via BazaarNow', tag: 'Commerce' },
];

function FeaturedSection() {
  return (
    <div style={{ padding: '40px', background: T.surface }}>
      <div
        style={{
          fontSize: 10,
          fontWeight: 500,
          letterSpacing: '.12em',
          textTransform: 'uppercase',
          color: T.text3,
          marginBottom: 24,
        }}
      >
        Featured This Week
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: 0 }}>
        {/* Large feature — Balwaan Krishi */}
        <div style={{ borderRight: `1px solid ${T.border}`, paddingRight: 32, gridRow: '1 / 3' }}>
          <div
            style={{
              fontSize: 10,
              fontWeight: 500,
              letterSpacing: '.1em',
              textTransform: 'uppercase',
              color: T.text3,
              marginBottom: 10,
              display: 'flex',
              alignItems: 'center',
              gap: 6,
            }}
          >
            <span
              style={{
                width: 6,
                height: 6,
                borderRadius: '50%',
                background: '#f59e0b',
                flexShrink: 0,
                display: 'inline-block',
              }}
            />
            AgriTech · Infrastructure
          </div>
          <div style={{ fontFamily: T.serif, fontSize: 21, lineHeight: 1.3, marginBottom: 10 }}>
            Balwaan Krishi&apos;s nationwide expansion signals India&apos;s agri-infrastructure
            maturity moment.
          </div>
          <div style={{ fontSize: 13, color: T.text2, lineHeight: 1.6, marginBottom: 14 }}>
            The Jaipur-based agri-machinery platform has opened a manufacturing hub and planted
            regional warehouses across five new states — building distribution density that will
            prove to be an unassailable moat. 500+ jobs created. 50 lakh+ farmers served. ₹87.9 Cr
            FY25 revenue.
          </div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 16 }}>
            <Tag label="AgriTech" color={T.amber} bg={T.amberBg} />
            <Tag label="Expansion" color={T.green} bg={T.greenBg} />
            <Tag label="Warmup Portfolio" color={T.purpleText} bg={T.purpleBg} />
          </div>
          <a
            href="https://www.global-agriculture.com/mechanization-technology/balwaan-krishi-expands-manufacturing-and-distribution-network-in-india/"
            target="_blank"
            rel="noopener noreferrer"
            style={{
              fontSize: 12,
              fontWeight: 500,
              color: T.purple,
              display: 'inline-flex',
              alignItems: 'center',
              gap: 4,
              textDecoration: 'none',
            }}
          >
            Deep Dive <ExternalLink size={12} />
          </a>
        </div>

        {/* Medium — Olee Space */}
        <div style={{ padding: '24px 28px', borderBottom: `1px solid ${T.border}` }}>
          <div
            style={{
              fontSize: 10,
              fontWeight: 500,
              letterSpacing: '.1em',
              textTransform: 'uppercase',
              color: T.text3,
              marginBottom: 10,
              display: 'flex',
              alignItems: 'center',
              gap: 6,
            }}
          >
            <span
              style={{
                width: 6,
                height: 6,
                borderRadius: '50%',
                background: '#3b82f6',
                display: 'inline-block',
              }}
            />
            SpaceTech · Defense
          </div>
          <div style={{ fontSize: 15, fontWeight: 500, marginBottom: 4 }}>Olee Space</div>
          <div style={{ fontSize: 20, fontWeight: 300, letterSpacing: -1, marginBottom: 10 }}>
            $3 M Seed
          </div>
          <div style={{ fontSize: 12, color: T.text2, lineHeight: 1.5, marginBottom: 10 }}>
            Rockstud Capital led. FSOC + Quantum KD + DEW systems. IIT Bombay founders. 85%
            indigenous content validated. Armed Forces pilot pipeline.
          </div>
          <a
            href="https://indianstartupnews.com/funding/olee-space-raises-3-million-to-advance-laser-based-quantum-communications-and-directed-energy-weapon-systems-9659808"
            target="_blank"
            rel="noopener noreferrer"
            style={{ textDecoration: 'none' }}
          >
            <Tag label="High Conviction ↑" color={T.blue} bg={T.blueBg} />
          </a>
        </div>

        {/* Medium — Boba Bhai */}
        <div
          style={{
            padding: '24px 28px',
            borderLeft: `1px solid ${T.border}`,
            borderBottom: `1px solid ${T.border}`,
          }}
        >
          <div
            style={{
              fontSize: 10,
              fontWeight: 500,
              letterSpacing: '.1em',
              textTransform: 'uppercase',
              color: T.text3,
              marginBottom: 10,
              display: 'flex',
              alignItems: 'center',
              gap: 6,
            }}
          >
            <span
              style={{
                width: 6,
                height: 6,
                borderRadius: '50%',
                background: '#a855f7',
                display: 'inline-block',
              }}
            />
            D2C · QSR · Consumer
          </div>
          <div style={{ fontSize: 15, fontWeight: 500, marginBottom: 4 }}>Boba Bhai</div>
          <div style={{ fontSize: 20, fontWeight: 300, letterSpacing: -1, marginBottom: 10 }}>
            ₹40 Cr Series A+
          </div>
          <div style={{ fontSize: 12, color: T.text2, lineHeight: 1.5, marginBottom: 10 }}>
            8i Ventures + Titan Capital led. FY25 revenue ₹30 Cr (500% YoY). 92+ stores in 8 cities.
            300 stores targeted in 12–14 months.
          </div>
          <a
            href="https://inc42.com/buzz/boba-bhai-nets-%E2%82%B940-cr-to-expand-offline-presence/"
            target="_blank"
            rel="noopener noreferrer"
            style={{ textDecoration: 'none' }}
          >
            <Tag label="Momentum ↑" color={T.green} bg={T.greenBg} />
          </a>
        </div>

        {/* Signal strip — spans rows 1-2 of col 3 (already done as col 3 grid cells above, need to handle) */}
        {/* Signal list as its own cell */}
      </div>

      {/* Signal strip below the grid on the right — restructured for simplicity */}
      <div style={{ marginTop: 24, borderTop: `1px solid ${T.border}`, paddingTop: 24 }}>
        <div
          style={{
            fontSize: 10,
            fontWeight: 500,
            letterSpacing: '.1em',
            textTransform: 'uppercase',
            color: T.text3,
            marginBottom: 16,
          }}
        >
          Ecosystem Signals
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5,1fr)', gap: 16 }}>
          {SIGNALS.map((s) => (
            <div key={s.text} style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
              <div
                style={{
                  width: 5,
                  height: 5,
                  borderRadius: '50%',
                  background: s.dot,
                  flexShrink: 0,
                  marginTop: 5,
                }}
              />
              <div>
                <div style={{ fontSize: 12, lineHeight: 1.5, color: T.text2, marginBottom: 2 }}>
                  {s.text}
                </div>
                <div style={{ fontSize: 10, fontWeight: 500, color: T.text3 }}>{s.tag}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── SECTION 4: Intel Strip ─────────────────────────────────────────────────

const CONVICTION = [
  {
    level: 'High Conviction',
    color: T.green,
    sectors: ['AgriTech Infra', 'Defense Tech', 'Vertical AI'],
  },
  { level: 'Stable', color: T.text2, sectors: ['B2B SaaS', 'Healthtech'] },
  { level: 'Watchlist', color: T.amber, sectors: ['AI Wrappers', 'Horizontal SaaS'] },
  { level: 'Cooling', color: '#b91c1c', sectors: ['Generic D2C', 'Late Consumer'] },
];

function IntelStrip() {
  return (
    <div style={{ padding: '40px', background: T.pageBg }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 32 }}>
        {/* Sector momentum */}
        <div>
          <div
            style={{
              fontSize: 11,
              fontWeight: 500,
              letterSpacing: '.1em',
              textTransform: 'uppercase',
              color: T.text3,
              marginBottom: 20,
            }}
          >
            Sector Momentum Index
          </div>
          {SECTORS.map((s) => {
            const barColor = s.dir === 'up' ? '#22c55e' : '#f97316';
            const valColor = s.dir === 'up' ? T.green : T.amber;
            return (
              <div
                key={s.label}
                style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}
              >
                <div style={{ fontSize: 12, color: T.text2, width: 76, flexShrink: 0 }}>
                  {s.label}
                </div>
                <div
                  style={{
                    flex: 1,
                    height: 4,
                    background: T.border,
                    borderRadius: 2,
                    overflow: 'hidden',
                  }}
                >
                  <div
                    style={{
                      height: '100%',
                      width: `${s.pct}%`,
                      background: barColor,
                      borderRadius: 2,
                    }}
                  />
                </div>
                <div
                  style={{
                    fontSize: 12,
                    fontWeight: 500,
                    color: valColor,
                    width: 44,
                    textAlign: 'right',
                    flexShrink: 0,
                  }}
                >
                  {s.val}
                </div>
              </div>
            );
          })}
        </div>

        {/* Conviction index */}
        <div>
          <div
            style={{
              fontSize: 11,
              fontWeight: 500,
              letterSpacing: '.1em',
              textTransform: 'uppercase',
              color: T.text3,
              marginBottom: 20,
            }}
          >
            Warmup Conviction Index
          </div>
          {CONVICTION.map((c) => (
            <div
              key={c.level}
              style={{ display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 12 }}
            >
              <div
                style={{
                  fontSize: 11,
                  fontWeight: 500,
                  color: c.color,
                  width: 64,
                  flexShrink: 0,
                  paddingTop: 2,
                }}
              >
                {c.level}
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                {c.sectors.map((s) => (
                  <span
                    key={s}
                    style={{
                      fontSize: 11,
                      padding: '2px 10px',
                      borderRadius: 100,
                      background: T.surface,
                      color: T.text2,
                    }}
                  >
                    {s}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── SECTION 5: Archive + Drawer ────────────────────────────────────────────

const FILTER_CHIPS = [
  { label: 'All', value: 'all' },
  { label: 'SpaceTech', value: 'spacetech' },
  { label: 'Fintech', value: 'fintech' },
  { label: 'D2C', value: 'd2c' },
  { label: 'AgriTech', value: 'agritech' },
  { label: 'Healthtech', value: 'healthtech' },
];

function EditionDrawer({ edition, onClose }: { edition: ArchiveEdition; onClose: () => void }) {
  const drawerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [onClose]);

  return (
    <>
      {/* Overlay */}
      <div
        onClick={onClose}
        style={{ position: 'fixed', inset: 0, background: 'rgba(15,25,35,0.4)', zIndex: 200 }}
      />
      {/* Drawer */}
      <div
        ref={drawerRef}
        style={{
          position: 'fixed',
          top: 0,
          right: 0,
          width: 600,
          height: '100vh',
          background: T.surface,
          zIndex: 201,
          overflowY: 'auto',
          boxShadow: '-8px 0 40px rgba(0,0,0,0.12)',
          fontFamily: T.sans,
        }}
      >
        <div
          style={{
            padding: '20px 28px',
            borderBottom: `1px solid ${T.border}`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            position: 'sticky',
            top: 0,
            background: T.surface,
            zIndex: 10,
          }}
        >
          <div>
            <div
              style={{
                fontSize: 10,
                fontWeight: 500,
                letterSpacing: '.12em',
                textTransform: 'uppercase',
                color: T.text3,
                marginBottom: 4,
              }}
            >
              {edition.issue} · {edition.date}
            </div>
            <div style={{ fontSize: 13, fontWeight: 500, color: edition.sectorColor }}>
              {edition.sector}
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              width: 32,
              height: 32,
              borderRadius: 8,
              border: `1px solid ${T.border}`,
              background: 'transparent',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: T.text2,
            }}
            aria-label="Close"
          >
            <X size={16} />
          </button>
        </div>

        <div style={{ padding: 28 }}>
          <div style={{ fontFamily: T.serif, fontSize: 22, lineHeight: 1.3, marginBottom: 20 }}>
            {edition.headline}
          </div>

          <div
            style={{
              fontSize: 13,
              fontWeight: 500,
              letterSpacing: '.06em',
              textTransform: 'uppercase',
              color: T.text3,
              marginBottom: 12,
              paddingTop: 24,
              borderTop: `1px solid ${T.border}`,
            }}
          >
            Key Signals This Edition
          </div>
          {edition.signals.map((sig) => (
            <div
              key={sig}
              style={{ padding: 14, borderRadius: 8, background: T.pageBg, marginBottom: 8 }}
            >
              <div style={{ fontSize: 13, color: T.text2, lineHeight: 1.5 }}>{sig}</div>
            </div>
          ))}

          <div style={{ display: 'flex', gap: 8, marginTop: 16, flexWrap: 'wrap' }}>
            <span
              style={{
                fontSize: 10,
                padding: '3px 10px',
                borderRadius: 100,
                background: T.pageBg,
                color: T.text2,
              }}
            >
              {edition.signalCount} signals
            </span>
            <span
              style={{
                fontSize: 10,
                padding: '3px 10px',
                borderRadius: 100,
                background: T.pageBg,
                color: T.text2,
              }}
            >
              {edition.portfolioCount} portfolio co.
            </span>
            <span
              style={{
                fontSize: 10,
                padding: '3px 10px',
                borderRadius: 100,
                background: edition.sentiment.bg,
                color: edition.sentiment.color,
                fontWeight: 500,
              }}
            >
              {edition.sentiment.label}
            </span>
          </div>

          <div style={{ marginTop: 24, paddingTop: 24, borderTop: `1px solid ${T.border}` }}>
            <div
              style={{
                fontFamily: T.serif,
                fontSize: 15,
                fontStyle: 'italic',
                lineHeight: 1.65,
                padding: 16,
                background: T.pageBg,
                borderRadius: 8,
                borderLeft: `3px solid ${T.purple}`,
                color: T.text,
              }}
            >
              &ldquo;The signals in this edition reflect our growing conviction that India&apos;s
              next decade of value creation will come from founders solving infrastructure-layer
              problems with capital-efficient, distribution-first businesses.&rdquo;
            </div>
            <div
              style={{
                marginTop: 8,
                fontSize: 11,
                color: T.text3,
                textTransform: 'uppercase',
                letterSpacing: '.06em',
              }}
            >
              Warmup Ventures · Partner Team
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

function ArchiveSection({
  activeFilter,
  setActiveFilter,
  filteredArchive,
  onOpenDrawer,
}: {
  activeFilter: string;
  setActiveFilter: (f: string) => void;
  filteredArchive: ArchiveEdition[];
  onOpenDrawer: (e: ArchiveEdition) => void;
}) {
  return (
    <div style={{ padding: '0 40px 60px', background: T.surface }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 20,
          paddingTop: 40,
        }}
      >
        <div style={{ fontFamily: T.serif, fontSize: 22, fontWeight: 400 }}>Past Editions</div>
      </div>

      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 24 }}>
        {FILTER_CHIPS.map((fc) => (
          <button
            key={fc.value}
            onClick={() => setActiveFilter(fc.value)}
            style={{
              fontSize: 11,
              fontWeight: 500,
              padding: '5px 14px',
              borderRadius: 100,
              cursor: 'pointer',
              border: `1px solid ${activeFilter === fc.value ? T.dark : T.border2}`,
              color: activeFilter === fc.value ? '#fff' : T.text2,
              background: activeFilter === fc.value ? T.dark : T.surface,
              fontFamily: T.sans,
              transition: 'all 0.15s',
            }}
          >
            {fc.label}
          </button>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
        {filteredArchive.map((ed) => (
          <div
            key={ed.id}
            style={{
              background: T.surface,
              borderRadius: 12,
              padding: 24,
              boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
              cursor: 'pointer',
              transition: 'all 0.2s',
            }}
            onMouseOver={(e) => {
              (e.currentTarget as HTMLDivElement).style.boxShadow = '0 4px 16px rgba(0,0,0,0.08)';
              (e.currentTarget as HTMLDivElement).style.transform = 'translateY(-1px)';
            }}
            onMouseOut={(e) => {
              (e.currentTarget as HTMLDivElement).style.boxShadow = '0 1px 3px rgba(0,0,0,0.04)';
              (e.currentTarget as HTMLDivElement).style.transform = 'translateY(0)';
            }}
          >
            <div
              style={{
                fontFamily: T.serif,
                fontSize: 20,
                fontWeight: 400,
                marginBottom: 4,
                color: ed.sectorColor,
              }}
            >
              {ed.sector}
            </div>
            <div style={{ fontSize: 11, color: T.text3, marginBottom: 16 }}>
              {ed.issue} · {ed.date}
            </div>

            <div style={{ height: 1, background: T.border, marginBottom: 14 }} />

            {ed.signals.map((sig) => (
              <div
                key={sig}
                style={{ display: 'flex', alignItems: 'flex-start', gap: 6, marginBottom: 6 }}
              >
                <div
                  style={{
                    width: 4,
                    height: 4,
                    borderRadius: '50%',
                    background: T.text3,
                    flexShrink: 0,
                    marginTop: 6,
                  }}
                />
                <div style={{ fontSize: 12, color: T.text2, lineHeight: 1.5 }}>{sig}</div>
              </div>
            ))}

            <div style={{ display: 'flex', gap: 8, marginTop: 14, flexWrap: 'wrap' }}>
              <span
                style={{
                  fontSize: 10,
                  fontWeight: 500,
                  padding: '3px 10px',
                  borderRadius: 100,
                  background: T.pageBg,
                  color: T.text2,
                }}
              >
                {ed.signalCount} signals
              </span>
              <span
                style={{
                  fontSize: 10,
                  fontWeight: 500,
                  padding: '3px 10px',
                  borderRadius: 100,
                  background: T.pageBg,
                  color: T.text2,
                }}
              >
                {ed.portfolioCount} portfolio
              </span>
              <span
                style={{
                  fontSize: 10,
                  fontWeight: 500,
                  padding: '3px 10px',
                  borderRadius: 100,
                  background: ed.sentiment.bg,
                  color: ed.sentiment.color,
                }}
              >
                {ed.sentiment.label}
              </span>
            </div>

            <button
              onClick={() => onOpenDrawer(ed)}
              style={{
                display: 'block',
                marginTop: 16,
                fontSize: 12,
                fontWeight: 500,
                color: T.purple,
                background: 'transparent',
                border: 'none',
                cursor: 'pointer',
                padding: 0,
                fontFamily: T.sans,
                textAlign: 'left',
              }}
            >
              Read Edition →
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Main export ────────────────────────────────────────────────────────────

export function MyDigestPage() {
  const user = useUser();
  const isAdmin = can(user?.role, 'admin.any');

  useDigestStyles();

  const [digestOpen, setDigestOpen] = useState(false);
  const [activeTab, setActiveTab] = useState(0);
  const [activeFilter, setActiveFilter] = useState('all');
  const [drawerEdition, setDrawerEdition] = useState<ArchiveEdition | null>(null);

  const filteredArchive =
    activeFilter === 'all' ? ARCHIVE : ARCHIVE.filter((e) => e.tags.includes(activeFilter));

  return (
    <div style={{ fontFamily: T.sans, color: T.text, margin: '-24px -16px', overflow: 'hidden' }}>
      <HeroSection
        isOpen={digestOpen}
        onToggle={() => {
          setDigestOpen((prev) => !prev);
          setActiveTab(0);
        }}
      />

      {digestOpen && (
        <FullDigestSection
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          onCollapse={() => setDigestOpen(false)}
        />
      )}

      <FeaturedSection />
      <IntelStrip />
      <ArchiveSection
        activeFilter={activeFilter}
        setActiveFilter={setActiveFilter}
        filteredArchive={filteredArchive}
        onOpenDrawer={setDrawerEdition}
      />

      {isAdmin && (
        <div style={{ padding: '16px 40px 40px', textAlign: 'right', background: T.surface }}>
          <Button variant="outline" size="sm" asChild>
            <Link to="/admin/digest">
              Admin digest console
              <ArrowRight className="ml-1 h-4 w-4" aria-hidden />
            </Link>
          </Button>
        </div>
      )}

      {drawerEdition && (
        <EditionDrawer edition={drawerEdition} onClose={() => setDrawerEdition(null)} />
      )}
    </div>
  );
}
