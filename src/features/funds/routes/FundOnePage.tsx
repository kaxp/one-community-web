import { useEffect, useRef, useState } from 'react';
import { useIsMobile } from '@/lib/hooks/use-is-mobile';
import {
  Bar,
  BarChart,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

// ── Palette ───────────────────────────────────────────────────────────────────
const BG = '#0f172a';
const SURFACE = '#1e293b';
const MUTED_BG = '#334155';
const BLUE = '#2563eb';
const CYAN = '#06b6d4';
const ORANGE = '#f97316';
const GREEN = '#10b981';
const TEXT = '#f1f5f9';
const TEXT_MUTED = '#94a3b8';
const AMBER = '#f59e0b';
const PURPLE = '#a855f7';
const ROSE = '#f43f5e';

// ── Hooks ─────────────────────────────────────────────────────────────────────
function useAnimatedFloat(target: number, decimals = 0, duration = 1500): string {
  const [val, setVal] = useState(0);
  useEffect(() => {
    if (target === 0) {
      setVal(0);
      return;
    }
    let id = 0;
    let startTime: number | null = null;
    const animate = (ts: number) => {
      if (startTime === null) startTime = ts;
      const progress = Math.min((ts - startTime) / duration, 1);
      setVal(progress * target);
      if (progress < 1) id = requestAnimationFrame(animate);
    };
    id = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(id);
  }, [target, duration]);
  return val.toFixed(decimals);
}

function useInView(threshold = 0.15) {
  const ref = useRef<HTMLDivElement>(null);
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          setInView(true);
          obs.disconnect();
        }
      },
      { threshold },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [threshold]);
  return { ref, inView };
}

// ── Sub-components ────────────────────────────────────────────────────────────
function HeroCounter({
  target,
  prefix = '',
  suffix = '',
  label,
  decimals = 0,
}: {
  target: number;
  prefix?: string;
  suffix?: string;
  label: string;
  decimals?: number;
}) {
  const value = useAnimatedFloat(target, decimals);
  return (
    <div style={{ textAlign: 'center', padding: '0 12px' }}>
      <div style={{ fontSize: '2.25rem', fontWeight: 800, color: CYAN, lineHeight: 1.1 }}>
        {prefix}
        {value}
        {suffix}
      </div>
      <div style={{ color: TEXT_MUTED, fontSize: '0.8rem', marginTop: 6, fontWeight: 500 }}>
        {label}
      </div>
    </div>
  );
}

function SectorBadge({ label, color }: { label: string; color: string }) {
  return (
    <span
      style={{
        background: color + '22',
        color,
        border: `1px solid ${color}44`,
        borderRadius: 99,
        padding: '2px 10px',
        fontSize: '0.7rem',
        fontWeight: 600,
        letterSpacing: '0.03em',
        display: 'inline-block',
      }}
    >
      {label}
    </span>
  );
}

function StatusBadge({ status }: { status: 'Profitable' | 'Growth' | 'Pre-revenue' }) {
  const colors: Record<string, string> = {
    Profitable: GREEN,
    Growth: BLUE,
    'Pre-revenue': TEXT_MUTED,
  };
  const color = colors[status] ?? TEXT_MUTED;
  return (
    <span
      style={{
        background: color + '22',
        color,
        border: `1px solid ${color}44`,
        borderRadius: 99,
        padding: '2px 8px',
        fontSize: '0.68rem',
        fontWeight: 600,
      }}
    >
      {status}
    </span>
  );
}

function Sparkline({ data }: { data: { v: number }[] }) {
  return (
    <ResponsiveContainer width="100%" height={60}>
      <LineChart data={data} margin={{ top: 4, right: 4, left: 4, bottom: 4 }}>
        <Line
          type="monotone"
          dataKey="v"
          stroke={CYAN}
          strokeWidth={2}
          dot={false}
          isAnimationActive
          animationDuration={1200}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}

// ── Data ──────────────────────────────────────────────────────────────────────
const MULTIPLES_DATA = [
  { company: 'Boba Bhai', multiple: 12, entryMrr: '₹80L', currentMrr: '₹8.82 Cr' },
  { company: 'Nitro Commerce', multiple: 5, entryMrr: '₹40L', currentMrr: '₹4.42 Cr' },
  { company: 'BIVA Analytics', multiple: 4.6, entryMrr: '₹6.4L', currentMrr: '₹15.25L' },
  { company: 'RocketPay', multiple: 3, entryMrr: '₹5L', currentMrr: '₹80L' },
  { company: 'Datoms', multiple: 2.5, entryMrr: '₹25L', currentMrr: '₹77L' },
];

const CAPITAL_MIX = [
  { name: 'B2C', value: 67 },
  { name: 'B2B', value: 33 },
];
const DEAL_MIX = [
  { name: 'B2C', value: 57 },
  { name: 'B2B', value: 43 },
];
const SECTOR_CAPITAL = [
  { name: 'Others', pct: 27 },
  { name: 'B2B Platforms', pct: 24 },
  { name: 'Consumer Tech', pct: 21 },
  { name: 'Consumer Brands', pct: 19 },
  { name: 'Fintech', pct: 9 },
];
const SECTOR_DEALS = [
  { name: 'B2B Platforms', pct: 24 },
  { name: 'Consumer Tech', pct: 24 },
  { name: 'Others', pct: 24 },
  { name: 'Consumer Brands', pct: 19 },
  { name: 'Fintech', pct: 10 },
];

const PIE_COLORS = [CYAN, BLUE];

const TIMELINE_ENTRIES = [
  { month: "Oct'23", company: 'Biva Analytics', sector: 'B2B SaaS', color: BLUE },
  { month: "Jan'24", company: 'GreenStitch', sector: 'SaaS ESG', color: BLUE },
  { month: "Feb'24", company: 'ReelSaga', sector: 'Media Tech', color: PURPLE },
  { month: "Feb'24", company: 'RocketPay', sector: 'FinTech', color: CYAN },
  { month: "Mar'24", company: 'Boba Bhai', sector: 'QSR', color: ORANGE },
  { month: "Mar'24", company: 'Datoms', sector: 'IoT + AI', color: CYAN },
  { month: "Mar'24", company: 'Inc42 Media', sector: 'Media Tech', color: PURPLE },
  { month: "Apr'24", company: 'WeVois Labs', sector: 'Clean-tech', color: GREEN },
  { month: "May'24", company: 'Nitro Commerce', sector: 'D2C', color: ORANGE },
  { month: "May'24", company: 'Tejas (Patcorn)', sector: 'Construction', color: AMBER },
  { month: "Jun'24", company: 'Nothing Before Coffee', sector: 'QSR', color: ORANGE },
  { month: "Jul'24", company: 'Minimines', sector: 'Clean-tech', color: GREEN },
  { month: "Oct'24", company: 'Balwaan Krishi', sector: 'Agri-tech', color: GREEN },
  { month: "Mar'25", company: 'Foxo Health', sector: 'Health Tech', color: ROSE },
  { month: "Mar'25", company: 'Yuri Skinscience', sector: 'Consumer', color: ORANGE },
  { month: "Mar'25", company: 'Jumbo Homes', sector: 'PropTech', color: CYAN },
  { month: "Jun'25", company: 'Crest Wealth', sector: 'Fintech', color: CYAN },
  { month: "Jan'26", company: 'Wippi', sector: 'EdTech', color: BLUE },
  { month: "Jan'26", company: 'Babai Tiffins', sector: 'QSR', color: ORANGE },
  { month: "Feb'26", company: 'Exiles Interactives', sector: 'Gaming', color: PURPLE },
  { month: "Feb'26", company: 'Koshiqa', sector: 'Health Tech', color: ROSE },
];

const HEALTH_SEGMENTS = {
  breakout: [
    'WeVois Labs',
    'Nitro Commerce',
    'Boba Bhai',
    'Balwaan Krishi',
    'Inc42 Media',
    'Minimines',
  ],
  growing: [
    'ReelSaga',
    'Tejas (Patcorn)',
    'GreenStitch',
    'Datoms',
    'Koshiqa',
    'Babai Tiffins',
    'Nothing Before Coffee',
    'Jumbo Homes',
  ],
  early: [
    'Wippi',
    'Exiles Interactives',
    'Foxo Health',
    'Yuri Skinscience',
    'RocketPay',
    'Biva Analytics',
    'Crest Wealth',
  ],
};

const COINVESTORS = [
  'Titan Capital',
  'Marshot Ventures',
  'Global Growth Capital',
  '8i Ventures',
  'Equanimity Ventures',
  'SucSeed Ventures',
  'Helios Holding',
  'Astir Ventures',
  'YourNest Venture Capital',
  'BeyondSeed',
  'Cornerstone Ventures',
  'Dholakia Ventures',
  'Lead Angels',
  'Beenext Asia Fund',
  'Shastra VC',
  'Pawan Munjal Family Office',
  'Equirus InnovateX Fund',
  'IvyCap Ventures',
  'ZeCa Ventures',
  'Picus Global',
  'ITI Fund',
  'Nazara Technologies',
  'ITI Growth Opportunities Fund',
  '3one4 Capital',
  'Unicorn India Ventures',
  'Eximius Trust',
  '3AI Holding',
  'MarsShot VC',
  'Negen Angel Fund',
  'Upaya Social Ventures',
  'Foundamental VC',
  'DeVC',
  'Prath Ventures',
  'MarsShot Ventures',
  'Chimera VC',
  'IndigoEdge',
  '12Flags VC',
  'Stellaris VC',
  'Inflection Point Ventures',
  'CDM Capital',
  'Blume Ventures',
  'Incrementum Ventures',
  'LogX Venture Partners',
  'Girnar Growth Ventures',
  'M Venture Partners',
  'JM Financial',
  'Caspian Impact Advisors',
  'Indigram Labs Foundation',
  'Z21 Ventures',
  'AC Ventures',
  'Venture Catalysts',
  'All In Capital',
  'Misfits',
  'GrayCell Ventures',
];

interface PortfolioCompany {
  name: string;
  tagline: string;
  sector: string;
  sectorColor: string;
  entryMonth: string;
  status: 'Profitable' | 'Growth' | 'Pre-revenue';
  coInvestors: string[];
  sparkline?: { v: number }[];
  primaryMetric?: { label: string; value: string };
}

const COMPANIES: PortfolioCompany[] = [
  {
    name: 'Boba Bhai',
    tagline: "QSR brand for bubble tea and Korean burgers; 86 outlets as of Mar'26.",
    sector: 'QSR',
    sectorColor: ORANGE,
    entryMonth: "Mar'24",
    status: 'Profitable',
    coInvestors: ['Titan Capital', 'Marshot Ventures', 'Global Growth Capital', '8i Ventures'],
    sparkline: [{ v: 7.11 }, { v: 6.63 }, { v: 8.82 }],
  },
  {
    name: 'Biva Analytics',
    tagline: 'E-commerce analytics SaaS for enterprises; ₹5-7L average order value.',
    sector: 'B2B SaaS',
    sectorColor: BLUE,
    entryMonth: "Oct'23",
    status: 'Growth',
    coInvestors: ['Equanimity Ventures', 'SucSeed Ventures', 'Helios Holding', 'Astir Ventures'],
    sparkline: [{ v: 20.3 }, { v: 15.73 }, { v: 15.92 }],
  },
  {
    name: 'Datoms',
    tagline: 'IoT and AI asset management for Amazon, Swiggy, and DHL across 425+ sites.',
    sector: 'IoT + AI',
    sectorColor: CYAN,
    entryMonth: "Mar'24",
    status: 'Growth',
    coInvestors: ['YourNest Venture Capital', 'BeyondSeed'],
    sparkline: [{ v: 107.71 }, { v: 81.97 }, { v: 77.06 }],
  },
  {
    name: 'Nitro Commerce',
    tagline:
      "Revenue-as-a-service for D2C brands; EBITA positive since Oct'25, 1,314 active clients.",
    sector: 'D2C',
    sectorColor: ORANGE,
    entryMonth: "May'24",
    status: 'Profitable',
    coInvestors: ['Cornerstone Ventures', 'Dholakia Ventures', 'Lead Angels'],
    primaryMetric: { label: "MRR Mar'26", value: '₹5.55 Cr' },
  },
  {
    name: 'Minimines',
    tagline: 'Lithium-ion battery recycling with 5.6x revenue growth and 13x EBITDA improvement.',
    sector: 'Clean-tech',
    sectorColor: GREEN,
    entryMonth: "Jul'24",
    status: 'Profitable',
    coInvestors: ['Beenext Asia Fund', 'Shastra VC', 'Pawan Munjal Family Office'],
    sparkline: [{ v: 3.78 }, { v: 13.16 }, { v: 21.32 }],
  },
  {
    name: 'GreenStitch',
    tagline: 'Sustainability SaaS for fashion and textile supply chains; 29 enterprise clients.',
    sector: 'SaaS ESG',
    sectorColor: BLUE,
    entryMonth: "Jan'24",
    status: 'Growth',
    coInvestors: ['Equirus InnovateX Fund', 'IvyCap Ventures', 'ZeCa Ventures'],
    sparkline: [{ v: 18.36 }, { v: 21.5 }, { v: 22.42 }],
  },
  {
    name: 'ReelSaga',
    tagline: 'Short-form serial drama platform; 5M+ downloads and 98% burn reduction.',
    sector: 'Media Tech',
    sectorColor: PURPLE,
    entryMonth: "Feb'24",
    status: 'Growth',
    coInvestors: ['Picus Global', 'ITI Fund', '8i Ventures', 'Nazara Technologies'],
    primaryMetric: { label: 'ARR Run Rate', value: '~$4.8M' },
  },
  {
    name: 'Inc42 Media',
    tagline: 'Largest startup media platform in India; EBITDA breakeven vs ₹8 Cr loss in FY25.',
    sector: 'Media Tech',
    sectorColor: PURPLE,
    entryMonth: "Mar'24",
    status: 'Profitable',
    coInvestors: [
      'ITI Growth Opportunities Fund',
      '3one4 Capital',
      'Unicorn India Ventures',
      'Eximius Trust',
      '3AI Holding',
    ],
    sparkline: [{ v: 70.71 }, { v: 513 }, { v: 847 }],
  },
  {
    name: 'WeVois Labs',
    tagline: 'IoT solid waste management; 30+ cities, 1,200+ tonnes/day, 17% EBITDA margin.',
    sector: 'Clean-tech',
    sectorColor: GREEN,
    entryMonth: "Apr'24",
    status: 'Profitable',
    coInvestors: ['MarsShot VC', 'Negen Angel Fund', 'Upaya Social Ventures'],
    primaryMetric: { label: 'FY26 Revenue', value: '₹91.67 Cr' },
  },
  {
    name: 'Tejas (Patcorn)',
    tagline: 'Smart construction materials; 3 patents, BIS certified, 9 distributors.',
    sector: 'Construction',
    sectorColor: AMBER,
    entryMonth: "May'24",
    status: 'Growth',
    coInvestors: ['Foundamental VC', 'DeVC'],
    sparkline: [{ v: 44.49 }, { v: 48.33 }, { v: 74.4 }],
  },
  {
    name: 'Nothing Before Coffee',
    tagline: "Youth-focused coffee QSR chain; 109 stores as of Mar'26, featured on Prime Video.",
    sector: 'QSR',
    sectorColor: ORANGE,
    entryMonth: "Jun'24",
    status: 'Growth',
    coInvestors: ['Prath Ventures', 'MarsShot Ventures'],
    sparkline: [{ v: 4.25 }, { v: 3.95 }, { v: 4.54 }],
  },
  {
    name: 'Exiles Interactives',
    tagline: 'Browser-based competitive gaming; 34 Twitch creators, 3 game launches.',
    sector: 'Gaming',
    sectorColor: PURPLE,
    entryMonth: "Feb'26",
    status: 'Pre-revenue',
    coInvestors: ['Chimera VC', 'IndigoEdge'],
    primaryMetric: { label: 'Game Launches', value: '3' },
  },
  {
    name: 'Wippi',
    tagline:
      'AI companion for kids: screen-free smart toy with 8 playsets, 700+ followers in week 1.',
    sector: 'EdTech',
    sectorColor: BLUE,
    entryMonth: "Jan'26",
    status: 'Pre-revenue',
    coInvestors: ['12Flags VC'],
    primaryMetric: { label: 'Batch 2 Planned', value: '1,200 units' },
  },
  {
    name: 'Koshiqa',
    tagline: 'Fitness and wellness platform; 4,09,943 total users, 15% engagement improvement.',
    sector: 'Health Tech',
    sectorColor: ROSE,
    entryMonth: "Feb'26",
    status: 'Pre-revenue',
    coInvestors: ['Stellaris VC'],
    primaryMetric: { label: 'Total Users', value: '4,09,943' },
  },
  {
    name: 'Babai Tiffins',
    tagline: 'Authentic Andhra cuisine QSR; 3 outlets, 62-63% CM, 21-22% outlet EBITDA.',
    sector: 'QSR',
    sectorColor: ORANGE,
    entryMonth: "Jan'26",
    status: 'Profitable',
    coInvestors: ['Inflection Point Ventures', 'CDM Capital'],
    sparkline: [{ v: 4.25 }, { v: 3.95 }, { v: 4.54 }],
  },
  {
    name: 'Yuri Skinscience',
    tagline: 'Korean skincare for sensitive skin; sulfate and paraben-free, 35-43 months runway.',
    sector: 'Consumer',
    sectorColor: ORANGE,
    entryMonth: "Mar'25",
    status: 'Growth',
    coInvestors: [
      'Blume Ventures',
      'Incrementum Ventures',
      'LogX Venture Partners',
      'Girnar Growth Ventures',
    ],
    sparkline: [{ v: 5.21 }, { v: 4.38 }, { v: 4.74 }],
  },
  {
    name: 'Jumbo Homes',
    tagline: 'AI-powered home buying across 8 cities; 40% discovery improvement, 1,500+ inventory.',
    sector: 'PropTech',
    sectorColor: CYAN,
    entryMonth: "Mar'25",
    status: 'Growth',
    coInvestors: ['M Venture Partners'],
    primaryMetric: { label: 'Homes Inventory', value: '1,500+' },
  },
  {
    name: 'Balwaan Krishi',
    tagline: 'Farm mechanization retail; FY25 revenue ₹135.4 Cr, PAT ₹2.87 Cr.',
    sector: 'Agri-tech',
    sectorColor: GREEN,
    entryMonth: "Oct'24",
    status: 'Profitable',
    coInvestors: ['JM Financial', 'Caspian Impact Advisors', 'Indigram Labs Foundation'],
    primaryMetric: { label: 'FY25 Revenue', value: '₹135.4 Cr' },
  },
  {
    name: 'Foxo Health',
    tagline: 'AI preventive healthcare; 50+ biomarkers, 95% accuracy, 15+ wearable integrations.',
    sector: 'Health Tech',
    sectorColor: ROSE,
    entryMonth: "Mar'25",
    status: 'Growth',
    coInvestors: ['Blume Ventures', 'Z21 Ventures', 'MarsShot Ventures', 'AC Ventures'],
    primaryMetric: { label: 'YTD Revenue', value: '₹67.15L' },
  },
  {
    name: 'Crest Wealth',
    tagline: 'Tech-enabled wealth management platform; metrics pending this quarter.',
    sector: 'Fintech',
    sectorColor: CYAN,
    entryMonth: "Jun'25",
    status: 'Pre-revenue',
    coInvestors: ['Lead Angels', 'Venture Catalysts'],
    primaryMetric: { label: 'Status', value: 'Metrics Pending' },
  },
  {
    name: 'RocketPay',
    tagline: 'Payment infrastructure with Trustonic partnership; 75% burn reduction to ₹11.5L/mo.',
    sector: 'FinTech',
    sectorColor: CYAN,
    entryMonth: "Feb'24",
    status: 'Growth',
    coInvestors: ['All In Capital', 'Misfits', 'GrayCell Ventures'],
    primaryMetric: { label: 'MRR Visibility', value: '₹27L' },
  },
];

const TEAM_FOUNDERS = [
  {
    initials: 'SB',
    name: 'Sharad Bansal',
    role: 'Co-Founder and Managing Partner',
    points: [
      'IIT Delhi',
      'Co-Founder Tinkerly',
      'Forbes Education Evangelist; IC member 4 seed funds',
    ],
  },
  {
    initials: 'YC',
    name: 'Yogesh Chaudhary',
    role: 'Founding Partner',
    points: [
      'Director and Owner, Jaipur Rugs',
      'Fortune India 40 Under 40 (2024)',
      '75+ startup portfolio; Top 100 Angel Investors India',
    ],
  },
  {
    initials: 'RL',
    name: 'Rajendra Lora',
    role: 'Founding Partner',
    points: ['Co-Founder and CEO Freshokartz', '₹150 Cr ARR, 5x MOIC', 'YourStory Tech30'],
  },
];

const TEAM_MEMBERS = [
  { name: 'Nikhil Mishra', role: 'VP Investments' },
  { name: 'Sinchana P', role: 'Investments' },
  { name: 'Raghav Katta', role: 'Investments and Portfolio Management' },
];

// ── Section components ────────────────────────────────────────────────────────
function StickyHeader() {
  return (
    <div
      style={{
        position: 'sticky',
        top: 0,
        zIndex: 10, // below mobile drawer overlay
        background: BG + 'ee',
        backdropFilter: 'blur(12px)',
        borderBottom: `1px solid ${MUTED_BG}`,
        padding: '12px 20px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: 8,
      }}
    >
      <div>
        <span style={{ color: TEXT, fontWeight: 700, fontSize: '1rem', letterSpacing: '-0.01em' }}>
          Warmup Ventures
        </span>
        <span style={{ color: TEXT_MUTED, marginLeft: 12, fontSize: '0.85rem' }}>
          Fund I: Q4 FY2026
        </span>
      </div>
      <span
        style={{
          background: ORANGE + '22',
          color: ORANGE,
          border: `1px solid ${ORANGE}44`,
          borderRadius: 99,
          padding: '4px 14px',
          fontSize: '0.7rem',
          fontWeight: 700,
          letterSpacing: '0.05em',
          textTransform: 'uppercase',
        }}
      >
        Confidential: For LP Use Only
      </span>
    </div>
  );
}

function HeroStrip() {
  return (
    <div
      style={{
        background: SURFACE,
        borderRadius: 16,
        padding: '32px 24px',
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
        gap: 24,
        border: `1px solid ${MUTED_BG}`,
      }}
    >
      <HeroCounter target={50} prefix="₹" suffix=" Cr" label="Fund Size" />
      <HeroCounter target={75} suffix="%" label="Gross IRR" />
      <HeroCounter target={21} label="Portfolio Companies" />
      <HeroCounter target={12} suffix="x" label="Top Multiple" />
      <HeroCounter
        target={91.67}
        prefix="₹"
        suffix=" Cr"
        label="Largest Portfolio Revenue"
        decimals={2}
      />
    </div>
  );
}

function ExecutiveSummary() {
  const wins = [
    {
      company: 'WeVois Labs',
      color: GREEN,
      headline: '79% YoY Growth',
      detail: '₹91.67 Cr revenue, 17% EBITDA margin, 30+ cities',
    },
    {
      company: 'Nitro Commerce',
      color: BLUE,
      headline: 'EBITA Positive',
      detail: "2.6x MRR growth, 1,314 clients (+155%), EBITA positive Oct'25",
    },
    {
      company: 'ReelSaga',
      color: PURPLE,
      headline: '98% Burn Reduction',
      detail: '₹1.8 Cr burn to ₹3L/mo, 5M+ downloads, ARR ~$4.8M',
    },
    {
      company: 'Inc42 Media',
      color: CYAN,
      headline: 'EBITDA Breakeven',
      detail: 'From ₹8 Cr loss to breakeven, 36% YoY revenue growth to ₹34.03 Cr',
    },
    {
      company: 'Boba Bhai',
      color: ORANGE,
      headline: 'USD 4.3M Raised',
      detail: '2.2x YoY growth, 20%+ EBITDA in mature stores, 12x multiple',
    },
  ];
  return (
    <div>
      <h2
        style={{
          color: TEXT,
          fontSize: 'clamp(0.85rem, 2vw, 1.1rem)',
          fontWeight: 700,
          marginBottom: 16,
        }}
      >
        Executive Summary
      </h2>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: 16,
        }}
      >
        {wins.map((w, i) => (
          <div
            key={w.company}
            style={{
              background: SURFACE,
              border: `1px solid ${w.color}33`,
              borderRadius: 12,
              padding: 20,
              animation: 'fadeInUp 0.5s ease-out both',
              animationDelay: `${i * 0.08}s`,
            }}
          >
            <div style={{ color: w.color, fontWeight: 700, fontSize: '0.75rem', marginBottom: 6 }}>
              {w.company}
            </div>
            <div style={{ color: TEXT, fontWeight: 700, fontSize: '1rem', marginBottom: 8 }}>
              {w.headline}
            </div>
            <div style={{ color: TEXT_MUTED, fontSize: '0.82rem', lineHeight: 1.5 }}>
              {w.detail}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function MultiplesLeaderboard() {
  const { ref, inView } = useInView();
  const chartData = inView ? MULTIPLES_DATA : MULTIPLES_DATA.map((d) => ({ ...d, multiple: 0 }));

  return (
    <div>
      <h2
        style={{
          color: TEXT,
          fontSize: 'clamp(0.85rem, 2vw, 1.1rem)',
          fontWeight: 700,
          marginBottom: 16,
        }}
      >
        Portfolio Multiples Leaderboard
      </h2>
      <div
        ref={ref}
        style={{
          background: SURFACE,
          border: `1px solid ${MUTED_BG}`,
          borderRadius: 16,
          padding: '24px 16px',
        }}
      >
        <ResponsiveContainer width="100%" height={220}>
          <BarChart layout="vertical" data={chartData} margin={{ left: 20, right: 40 }}>
            <XAxis
              type="number"
              domain={[0, 14]}
              tick={{ fill: TEXT_MUTED, fontSize: 11 }}
              axisLine={{ stroke: MUTED_BG }}
              tickLine={false}
            />
            <YAxis
              type="category"
              dataKey="company"
              tick={{ fill: TEXT, fontSize: 12 }}
              axisLine={false}
              tickLine={false}
              width={120}
            />
            <Tooltip
              contentStyle={{
                background: SURFACE,
                border: `1px solid ${MUTED_BG}`,
                borderRadius: 8,
              }}
              labelStyle={{ color: TEXT }}
              itemStyle={{ color: CYAN }}
              formatter={(v) => [`${v ?? ''}x`, 'Multiple']}
            />
            <Bar
              dataKey="multiple"
              radius={[0, 6, 6, 0]}
              isAnimationActive
              animationDuration={1200}
              label={{
                position: 'right',
                formatter: (v: unknown) => (typeof v === 'number' && v > 0 ? `${v}x` : ''),
                fill: TEXT,
                fontSize: 12,
                fontWeight: 700,
              }}
            >
              {chartData.map((_, i) => {
                const t = i / (chartData.length - 1);
                const r = Math.round(
                  parseInt(ORANGE.slice(1, 3), 16) * (1 - t) + parseInt(CYAN.slice(1, 3), 16) * t,
                );
                const g = Math.round(
                  parseInt(ORANGE.slice(3, 5), 16) * (1 - t) + parseInt(CYAN.slice(3, 5), 16) * t,
                );
                const b = Math.round(
                  parseInt(ORANGE.slice(5, 7), 16) * (1 - t) + parseInt(CYAN.slice(5, 7), 16) * t,
                );
                const color = `rgb(${r},${g},${b})`;
                return <Cell key={i} fill={color} />;
              })}
            </Bar>
          </BarChart>
        </ResponsiveContainer>

        <div
          style={{
            marginTop: 16,
            overflowX: 'auto',
          }}
        >
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem' }}>
            <thead>
              <tr style={{ borderBottom: `1px solid ${MUTED_BG}` }}>
                {['Company', 'Multiple', 'Entry MRR', 'Current MRR'].map((h) => (
                  <th
                    key={h}
                    style={{
                      color: TEXT_MUTED,
                      padding: '6px 12px',
                      textAlign: 'left',
                      fontWeight: 600,
                    }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {MULTIPLES_DATA.map((r) => (
                <tr key={r.company} style={{ borderBottom: `1px solid ${MUTED_BG}33` }}>
                  <td style={{ color: TEXT, padding: '6px 12px', fontWeight: 600 }}>{r.company}</td>
                  <td style={{ color: ORANGE, padding: '6px 12px', fontWeight: 700 }}>
                    {r.multiple}x
                  </td>
                  <td style={{ color: TEXT_MUTED, padding: '6px 12px' }}>{r.entryMrr}</td>
                  <td style={{ color: CYAN, padding: '6px 12px', fontWeight: 600 }}>
                    {r.currentMrr}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function PortfolioSnapshot() {
  const { ref: pieRef, inView: pieInView } = useInView();
  const { ref: barRef, inView: barInView } = useInView();
  const isMobile = useIsMobile();

  const capData = pieInView ? CAPITAL_MIX : CAPITAL_MIX.map((d) => ({ ...d, value: 0 }));
  const dealData = pieInView ? DEAL_MIX : DEAL_MIX.map((d) => ({ ...d, value: 0 }));
  const sCapData = barInView ? SECTOR_CAPITAL : SECTOR_CAPITAL.map((d) => ({ ...d, pct: 0 }));
  const sDealsData = barInView ? SECTOR_DEALS : SECTOR_DEALS.map((d) => ({ ...d, pct: 0 }));

  // RESPONSIVE: stack to 1-col on mobile
  const gridCols = isMobile ? '1fr' : '1fr 1fr';

  return (
    <div>
      <h2
        style={{
          color: TEXT,
          fontSize: 'clamp(0.85rem, 2vw, 1.1rem)',
          fontWeight: 700,
          marginBottom: 16,
        }}
      >
        Portfolio Snapshot
      </h2>
      <div
        ref={pieRef}
        style={{ display: 'grid', gridTemplateColumns: gridCols, gap: 16, marginBottom: 16 }}
      >
        {[
          { title: 'Capital Mix', data: capData },
          { title: 'Deal Count Mix', data: dealData },
        ].map(({ title, data }) => (
          <div
            key={title}
            style={{
              background: SURFACE,
              border: `1px solid ${MUTED_BG}`,
              borderRadius: 16,
              padding: 20,
            }}
          >
            <div
              style={{ color: TEXT_MUTED, fontSize: '0.8rem', fontWeight: 600, marginBottom: 8 }}
            >
              {title}
            </div>
            {/* Fixed height prevents label overflow clipping */}
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie
                  data={data}
                  cx="50%"
                  cy="50%"
                  innerRadius={52}
                  outerRadius={78}
                  dataKey="value"
                  isAnimationActive
                  animationDuration={1200}
                  label={false}
                >
                  {data.map((_, i) => (
                    <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length] ?? CYAN} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    background: SURFACE,
                    border: `1px solid ${MUTED_BG}`,
                    borderRadius: 8,
                  }}
                  itemStyle={{ color: TEXT }}
                  formatter={(v) => [`${v ?? ''}%`]}
                />
              </PieChart>
            </ResponsiveContainer>
            {/* Legend list replaces inline pie labels */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px 12px', marginTop: 8 }}>
              {data.map((d, i) => (
                <div key={d.name} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                  <div
                    style={{
                      width: 8,
                      height: 8,
                      borderRadius: '50%',
                      background: PIE_COLORS[i % PIE_COLORS.length] ?? CYAN,
                      flexShrink: 0,
                    }}
                  />
                  <span style={{ fontSize: '0.7rem', color: TEXT_MUTED }}>
                    {d.name} {d.value}%
                  </span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div ref={barRef} style={{ display: 'grid', gridTemplateColumns: gridCols, gap: 16 }}>
        {[
          { title: 'Sector Mix: Capital', data: sCapData },
          { title: 'Sector Mix: Deals', data: sDealsData },
        ].map(({ title, data }) => (
          <div
            key={title}
            style={{
              background: SURFACE,
              border: `1px solid ${MUTED_BG}`,
              borderRadius: 16,
              padding: 20,
            }}
          >
            <div
              style={{ color: TEXT_MUTED, fontSize: '0.8rem', fontWeight: 600, marginBottom: 12 }}
            >
              {title}
            </div>
            <ResponsiveContainer width="100%" height={180}>
              <BarChart layout="vertical" data={data} margin={{ left: 0, right: 30 }}>
                <XAxis
                  type="number"
                  domain={[0, 30]}
                  tick={{ fill: TEXT_MUTED, fontSize: 10 }}
                  tickLine={false}
                  axisLine={{ stroke: MUTED_BG }}
                />
                <YAxis
                  type="category"
                  dataKey="name"
                  tick={{ fill: TEXT, fontSize: 10 }}
                  axisLine={false}
                  tickLine={false}
                  width={isMobile ? 80 : 100}
                />
                <Bar
                  dataKey="pct"
                  fill={BLUE}
                  radius={[0, 4, 4, 0]}
                  isAnimationActive
                  animationDuration={1200}
                  label={{
                    position: 'right',
                    formatter: (v: unknown) => (typeof v === 'number' && v > 0 ? `${v}%` : ''),
                    fill: TEXT_MUTED,
                    fontSize: 10,
                  }}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        ))}
      </div>
    </div>
  );
}

function InvestmentTimeline() {
  const [mounted, setMounted] = useState(false);
  const isMobile = useIsMobile();
  // RESPONSIVE: fewer items per row on mobile
  const itemsPerRow = isMobile ? 3 : 5;
  useEffect(() => {
    const t = setTimeout(() => setMounted(true), 200);
    return () => clearTimeout(t);
  }, []);

  // Split entries into rows for snake layout
  const rows: (typeof TIMELINE_ENTRIES)[] = [];
  for (let i = 0; i < TIMELINE_ENTRIES.length; i += itemsPerRow) {
    rows.push(TIMELINE_ENTRIES.slice(i, i + itemsPerRow));
  }

  return (
    <div>
      <h2
        style={{
          color: TEXT,
          fontSize: isMobile ? '0.95rem' : '1.1rem',
          fontWeight: 700,
          marginBottom: 16,
        }}
      >
        Investment Timeline
      </h2>
      <div
        style={{
          background: SURFACE,
          border: `1px solid ${MUTED_BG}`,
          borderRadius: 16,
          padding: isMobile ? '20px 16px' : '28px 24px',
          overflow: 'hidden',
        }}
      >
        {rows.map((row, rowIdx) => {
          // Odd rows read right-to-left — reverse so chronological order snakes
          const isReverse = rowIdx % 2 === 1;
          const displayRow = isReverse ? [...row].reverse() : row;
          const isLastRow = rowIdx === rows.length - 1;

          return (
            <div key={rowIdx}>
              {/* Row of timeline items */}
              <div style={{ position: 'relative', display: 'flex', alignItems: 'flex-start' }}>
                {/* Horizontal connector line through dots */}
                <div
                  style={{
                    position: 'absolute',
                    top: 10,
                    left: 10,
                    right: 10,
                    height: 2,
                    background: MUTED_BG,
                    zIndex: 0,
                  }}
                />
                {displayRow.map((entry, colIdx) => {
                  const globalIdx =
                    rowIdx * itemsPerRow + (isReverse ? row.length - 1 - colIdx : colIdx);
                  return (
                    <div
                      key={`${entry.company}-${globalIdx}`}
                      style={{
                        flex: 1,
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        position: 'relative',
                        zIndex: 1,
                        paddingBottom: 12,
                      }}
                    >
                      <div
                        style={{
                          width: 20,
                          height: 20,
                          borderRadius: '50%',
                          background: entry.color,
                          border: `3px solid ${BG}`,
                          boxShadow: `0 0 0 2px ${entry.color}`,
                          flexShrink: 0,
                          transform: mounted ? 'scale(1)' : 'scale(0)',
                          transition: `transform 0.3s ease-out ${globalIdx * 0.04}s`,
                        }}
                      />
                      <div
                        style={{
                          marginTop: 8,
                          textAlign: 'center',
                          padding: '0 2px',
                          opacity: mounted ? 1 : 0,
                          transition: `opacity 0.3s ease-out ${globalIdx * 0.04 + 0.1}s`,
                        }}
                      >
                        <div
                          style={{
                            color: TEXT_MUTED,
                            fontSize: '0.6rem',
                            fontWeight: 600,
                            marginBottom: 3,
                          }}
                        >
                          {entry.month}
                        </div>
                        <div
                          style={{
                            color: TEXT,
                            fontSize: isMobile ? '0.65rem' : '0.72rem',
                            fontWeight: 600,
                            lineHeight: 1.3,
                            marginBottom: 4,
                          }}
                        >
                          {entry.company}
                        </div>
                        <SectorBadge label={entry.sector} color={entry.color} />
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Vertical connector at end of row → start of next */}
              {!isLastRow && (
                <div style={{ position: 'relative', height: 24 }}>
                  <div
                    style={{
                      position: 'absolute',
                      // Right side for LTR rows, left side for RTL rows
                      [isReverse ? 'left' : 'right']: 10,
                      top: 0,
                      bottom: 0,
                      width: 2,
                      background: MUTED_BG,
                    }}
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function PortfolioHealth() {
  const segments = [
    { key: 'breakout', label: 'Breakout', color: GREEN, companies: HEALTH_SEGMENTS.breakout },
    { key: 'growing', label: 'Growing', color: AMBER, companies: HEALTH_SEGMENTS.growing },
    { key: 'early', label: 'Early Stage', color: BLUE, companies: HEALTH_SEGMENTS.early },
  ];
  return (
    <div>
      <h2
        style={{
          color: TEXT,
          fontSize: 'clamp(0.85rem, 2vw, 1.1rem)',
          fontWeight: 700,
          marginBottom: 16,
        }}
      >
        Portfolio Health Segmentation
      </h2>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: 16,
        }}
      >
        {segments.map((seg) => (
          <div
            key={seg.key}
            style={{
              background: SURFACE,
              border: `1px solid ${seg.color}33`,
              borderRadius: 16,
              padding: 20,
            }}
          >
            <div
              style={{
                color: seg.color,
                fontWeight: 700,
                fontSize: '0.85rem',
                marginBottom: 12,
                display: 'flex',
                alignItems: 'center',
                gap: 8,
              }}
            >
              <span
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: '50%',
                  background: seg.color,
                  display: 'inline-block',
                }}
              />
              {seg.label}
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {seg.companies.map((name) => (
                <span
                  key={name}
                  style={{
                    background: seg.color + '18',
                    color: seg.color,
                    border: `1px solid ${seg.color}33`,
                    borderRadius: 99,
                    padding: '3px 10px',
                    fontSize: '0.72rem',
                    fontWeight: 600,
                  }}
                >
                  {name}
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function PortfolioCards() {
  return (
    <div>
      <h2
        style={{
          color: TEXT,
          fontSize: 'clamp(0.85rem, 2vw, 1.1rem)',
          fontWeight: 700,
          marginBottom: 16,
        }}
      >
        Portfolio Companies
      </h2>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
          gap: 16,
        }}
      >
        {COMPANIES.map((co, i) => (
          <div
            key={co.name}
            style={{
              background: SURFACE,
              border: `1px solid ${MUTED_BG}`,
              borderRadius: 16,
              padding: 20,
              display: 'flex',
              flexDirection: 'column',
              gap: 12,
              animation: 'fadeInUp 0.45s ease-out both',
              animationDelay: `${(i % 9) * 0.07}s`,
            }}
          >
            {/* Header row */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'flex-start',
                gap: 8,
              }}
            >
              <div style={{ minWidth: 0 }}>
                <div style={{ color: TEXT, fontWeight: 700, fontSize: '0.95rem', lineHeight: 1.2 }}>
                  {co.name}
                </div>
                <div style={{ color: TEXT_MUTED, fontSize: '0.72rem', marginTop: 2 }}>
                  {co.entryMonth}
                </div>
              </div>
              <div
                style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}
              >
                <SectorBadge label={co.sector} color={co.sectorColor} />
                <StatusBadge status={co.status} />
              </div>
            </div>

            {/* Tagline */}
            <div style={{ color: TEXT_MUTED, fontSize: '0.8rem', lineHeight: 1.5 }}>
              {co.tagline}
            </div>

            {/* Sparkline or key metric */}
            {co.sparkline ? (
              <div style={{ marginTop: -4, marginBottom: -4 }}>
                <Sparkline data={co.sparkline} />
              </div>
            ) : co.primaryMetric ? (
              <div
                style={{
                  background: BG,
                  borderRadius: 10,
                  padding: '10px 14px',
                }}
              >
                <div style={{ color: TEXT_MUTED, fontSize: '0.7rem' }}>
                  {co.primaryMetric.label}
                </div>
                <div style={{ color: CYAN, fontSize: '1.2rem', fontWeight: 700 }}>
                  {co.primaryMetric.value}
                </div>
              </div>
            ) : null}

            {/* Co-investors */}
            <div
              style={{
                color: TEXT_MUTED,
                fontSize: '0.72rem',
                borderTop: `1px solid ${MUTED_BG}`,
                paddingTop: 10,
              }}
            >
              <span style={{ color: TEXT_MUTED, fontWeight: 600 }}>Co-investors: </span>
              {co.coInvestors.join(', ')}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function CoInvestorEcosystem() {
  return (
    <div>
      <h2 style={{ color: TEXT, fontSize: '1.1rem', fontWeight: 700, marginBottom: 4 }}>
        We co-invest alongside
      </h2>
      <div
        style={{
          background: SURFACE,
          border: `1px solid ${MUTED_BG}`,
          borderRadius: 16,
          padding: 24,
          display: 'flex',
          flexWrap: 'wrap',
          gap: 10,
        }}
      >
        {COINVESTORS.map((name) => (
          <span
            key={name}
            style={{
              background: MUTED_BG,
              color: TEXT_MUTED,
              borderRadius: 99,
              padding: '5px 14px',
              fontSize: '0.78rem',
              fontWeight: 500,
            }}
          >
            {name}
          </span>
        ))}
      </div>
    </div>
  );
}

function TeamSection() {
  return (
    <div>
      <h2
        style={{
          color: TEXT,
          fontSize: 'clamp(0.85rem, 2vw, 1.1rem)',
          fontWeight: 700,
          marginBottom: 16,
        }}
      >
        Team
      </h2>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: 16,
          marginBottom: 16,
        }}
      >
        {TEAM_FOUNDERS.map((p) => (
          <div
            key={p.name}
            style={{
              background: SURFACE,
              border: `1px solid ${MUTED_BG}`,
              borderRadius: 16,
              padding: 24,
              display: 'flex',
              gap: 16,
              alignItems: 'flex-start',
            }}
          >
            <div
              style={{
                width: 44,
                height: 44,
                borderRadius: '50%',
                background: BLUE + '33',
                border: `2px solid ${BLUE}`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: BLUE,
                fontWeight: 800,
                fontSize: '0.85rem',
                flexShrink: 0,
              }}
            >
              {p.initials}
            </div>
            <div>
              <div style={{ color: TEXT, fontWeight: 700, fontSize: '0.9rem' }}>{p.name}</div>
              <div style={{ color: CYAN, fontSize: '0.75rem', marginBottom: 10 }}>{p.role}</div>
              {p.points.map((pt) => (
                <div key={pt} style={{ color: TEXT_MUTED, fontSize: '0.75rem', marginBottom: 3 }}>
                  {pt}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
          gap: 16,
        }}
      >
        {TEAM_MEMBERS.map((m) => (
          <div
            key={m.name}
            style={{
              background: SURFACE,
              border: `1px solid ${MUTED_BG}`,
              borderRadius: 12,
              padding: 16,
            }}
          >
            <div style={{ color: TEXT, fontWeight: 600, fontSize: '0.88rem' }}>{m.name}</div>
            <div style={{ color: TEXT_MUTED, fontSize: '0.75rem', marginTop: 2 }}>{m.role}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function FooterSection() {
  return (
    <div
      style={{
        background: SURFACE,
        border: `1px solid ${MUTED_BG}`,
        borderRadius: 16,
        padding: '24px 32px',
        textAlign: 'center',
      }}
    >
      <div style={{ color: TEXT_MUTED, fontSize: '0.75rem', marginBottom: 12 }}>
        This document is confidential and intended solely for the addressee. Any reproduction or
        distribution without prior written consent of Warmup Ventures is prohibited.
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: 20 }}>
        {[
          'pitch@warmupventures.com',
          'partner@warmupventures.com',
          'www.warmupventures.com',
          'Q4 FY2026',
        ].map((item) => (
          <span key={item} style={{ color: CYAN, fontSize: '0.78rem', fontWeight: 500 }}>
            {item}
          </span>
        ))}
      </div>
    </div>
  );
}

// ── Main export ───────────────────────────────────────────────────────────────
export function FundOnePage() {
  const isMobile = useIsMobile();
  return (
    <>
      <style>{`
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(16px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
      <div
        style={{
          background: BG,
          color: TEXT,
          minHeight: '100%',
          fontFamily: 'inherit',
        }}
      >
        <StickyHeader />
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 40,
            // RESPONSIVE: reduce page padding on mobile
            padding: isMobile ? '20px 16px 48px' : '32px 24px 48px',
          }}
        >
          <HeroStrip />
          <ExecutiveSummary />
          <MultiplesLeaderboard />
          <PortfolioSnapshot />
          <InvestmentTimeline />
          <PortfolioHealth />
          <PortfolioCards />
          <CoInvestorEcosystem />
          <TeamSection />
          <FooterSection />
        </div>
      </div>
    </>
  );
}
