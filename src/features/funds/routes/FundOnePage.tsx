import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TrendingUp, Users, IndianRupee, BarChart3, Layers } from 'lucide-react';

// ── Data from Q2 FY 2026 quarterly report ─────────────────────────────────────

const FUND_STATS = [
  { label: 'MOIC', value: '1.64×', sub: 'Conservative estimate' },
  { label: 'Fund IRR', value: '74.63%', sub: "Based on investments till Aug'25" },
  { label: 'Capital Deployed', value: '₹13 CR+', sub: 'Blind pool + top-up' },
  { label: 'Investments Closed', value: '18 / 20', sub: '20 committed' },
];

const CAPITAL_SUMMARY = [
  {
    label: 'Corpus',
    q1: '₹20 CR (Blind Pool) + ₹30 CR (Top-Up)',
    q2: '₹20 CR (Blind Pool) + ₹30 CR (Top-Up)',
  },
  { label: 'Investments committed', q1: '20', q2: '20' },
  { label: 'Investments closed', q1: '17', q2: '18' },
  { label: 'Capital committed to startups', q1: '₹16 CR', q2: '₹16 CR' },
  { label: 'Capital deployed', q1: '₹8.75 CR + ₹3.75 CR', q2: '₹9.25 CR + ₹3.75 CR' },
];

const DEAL_FUNNEL = [
  { label: 'Total Startups Reviewed', value: 950, pct: 100 },
  { label: 'Team Intro Calls', value: 325, pct: 34 },
  { label: 'Partner Intro Calls', value: 185, pct: 19 },
  { label: 'Deep Dive Calls', value: 45, pct: 5 },
  { label: 'Pipeline', value: 10, pct: 1 },
];

interface Company {
  name: string;
  business: string;
  round: string;
  warmup: string;
  coInvestors: string;
  month: string;
  metrics?: { label: string; aug: string }[];
  sector?: string;
}

const PORTFOLIO: Company[] = [
  {
    name: 'Biva Analytics',
    business: 'No-code reporting tool for e-commerce businesses',
    round: '₹4.15 CR',
    warmup: '₹50 L',
    month: "Oct'23",
    coInvestors: 'Equanimity, SucSeed, T-Hub',
    sector: 'SaaS',
    metrics: [
      { label: 'Revenue (Aug)', aug: '₹39.8 L' },
      { label: 'AOV (Aug)', aug: '₹7.95 L' },
    ],
  },
  {
    name: 'RocketPay',
    business: "India's first automatic credit collection app on UPI autopay & e-NACH",
    round: '₹4.84 CR',
    warmup: '₹50 L',
    month: "Feb'24",
    coInvestors: 'All In Capital, Misfits, GrayCell',
    sector: 'Fintech',
    metrics: [{ label: 'MRR (Jul)', aug: '₹78 L' }],
  },
  {
    name: 'Datoms',
    business: 'IoT-enabled asset management platform for distributed asset sector',
    round: '₹10 CR',
    warmup: '₹50 L',
    month: "Mar'24",
    coInvestors: 'YourNest, BeyondSeed',
    sector: 'DeepTech',
    metrics: [
      { label: 'Revenue (Aug)', aug: '₹73.9 L' },
      { label: 'Gross Margin', aug: '54.72%' },
    ],
  },
  {
    name: 'Boba Bhai',
    business: 'QSR brand on Bubble Tea & Korean Burgers',
    round: '₹9 CR',
    warmup: '₹50 L',
    month: "Mar'24",
    coInvestors: 'Titan Capital, Marshot, Global Growth Capital',
    sector: 'Consumer',
    metrics: [
      { label: 'Net Revenue (Aug)', aug: '₹4.85 CR' },
      { label: 'Stores', aug: '71' },
      { label: 'CM2 (Aug)', aug: '23.06%' },
    ],
  },
  {
    name: 'Nitro Commerce',
    business: 'Revenue-as-a-service platform for D2C brands',
    round: '₹15 CR',
    warmup: '₹41 L',
    month: "May'24",
    coInvestors: 'Cornerstone, Dholakia, Lead Angels',
    sector: 'SaaS',
    metrics: [
      { label: 'MRR (Aug)', aug: '₹2.42 CR' },
      { label: 'Active Clients', aug: '722' },
    ],
  },
  {
    name: 'MiniMines',
    business: 'Lithium-ion battery recycling & critical mineral recovery',
    round: '₹43.9 CR',
    warmup: '₹25.8 L',
    month: "Jun'24",
    coInvestors: 'Beenext Asia, Shastra VC, Pawan Munjal Family Office',
    sector: 'CleanTech',
    metrics: [{ label: 'MRR (Jul)', aug: '₹5.94 CR' }],
  },
  {
    name: 'Inc42 Media',
    business: "India's largest tech media platform for startups",
    round: '₹21 CR',
    warmup: '₹57 L',
    month: "Jul'24",
    coInvestors: 'ITI Growth, 3one4 Capital, Unicorn India, Eximius',
    sector: 'Media',
    metrics: [{ label: 'MRR (Aug)', aug: '₹3.57 CR' }],
  },
  {
    name: 'Balwaan Krishi',
    business: 'Online retailer of agricultural machines and tools',
    round: '₹40 CR',
    warmup: '₹50 L + ₹2.62 CR',
    month: "Sep'24",
    coInvestors: 'JM Financial PE, Caspian, Indigram Labs',
    sector: 'AgriTech',
    metrics: [],
  },
  {
    name: 'WeVois',
    business: 'IoT-based solid waste management & materials recovery',
    round: '₹40 CR',
    warmup: '₹70 L (top-up)',
    month: "Sep'24",
    coInvestors: 'MarsShot VC, Negen Angel, Upaya Social',
    sector: 'CleanTech',
    metrics: [{ label: 'Revenue FY25(P)', aug: '₹51.2 CR' }],
  },
  {
    name: 'GreenStitch',
    business: 'Sustainability SaaS for fashion & textiles supply chain',
    round: '₹10 CR',
    warmup: '₹70 L',
    month: "Dec'24",
    coInvestors: 'Equirus InnovateX, IvyCap, ZeCa',
    sector: 'SaaS',
    metrics: [
      { label: 'MRR (Aug)', aug: '₹15.5 L' },
      { label: 'Active Clients', aug: '21' },
    ],
  },
  {
    name: 'ReelSaga',
    business: 'Platform for serialized short drama videos (mobile-first)',
    round: '₹18 CR',
    warmup: '₹70 L',
    month: "Mar'25",
    coInvestors: 'Picus Global, ITI Fund, 8i, Nazara',
    sector: 'Media',
    metrics: [
      { label: '700K+ installs', aug: '2× MoM' },
      { label: 'Revenue (Jul)', aug: '₹1 CR' },
    ],
  },
  {
    name: 'Foxo Health',
    business: 'AI-powered personalised health plans for longevity & preventive care',
    round: '₹4 CR',
    warmup: '₹80 L',
    month: "Feb'25",
    coInvestors: 'Blume, Z21, MarsShot, AC Ventures',
    sector: 'HealthTech',
    metrics: [{ label: 'Active Customers', aug: '25' }],
  },
  {
    name: 'Jumbo Homes',
    business: 'Simplest way to buy a ready-to-move home in Bangalore',
    round: '₹4 CR',
    warmup: '₹50 L',
    month: "Mar'25",
    coInvestors: 'M Venture Partners, Super Angels',
    sector: 'PropTech',
    metrics: [
      { label: 'GTV (Jul)', aug: '₹10 CR' },
      { label: 'Homes Added (Aug)', aug: '103' },
    ],
  },
  {
    name: 'Yuri Skinscience',
    business: 'Korean skincare brand for sensitive skin (sulfate/paraben-free)',
    round: '₹1.5 CR',
    warmup: '₹50 L',
    month: "Mar'25",
    coInvestors: 'Blume, Incrementum, LogX, Girnar Growth',
    sector: 'Consumer',
    metrics: [{ label: 'Repeat Rate', aug: '10%' }],
  },
  {
    name: 'Tejas (Patcorn)',
    business: 'Smart construction material solutions & contractor rewards platform',
    round: '₹10 CR',
    warmup: '₹50 L',
    month: "Apr'25",
    coInvestors: 'Foundamental VC, DeVC',
    sector: 'Construction',
    metrics: [
      { label: 'Revenue (Aug)', aug: '₹26.6 L' },
      { label: 'Contractors', aug: '125' },
    ],
  },
  {
    name: 'Nothing Before Coffee',
    business: 'Youth-focused affordable coffee QSR chain (Gen Z & millennial)',
    round: '₹20 CR',
    warmup: '₹50 L + ₹25 L',
    month: "Apr'25",
    coInvestors: 'Prath Ventures, MarsShot',
    sector: 'Consumer',
    metrics: [
      { label: 'Total Sales (Aug)', aug: '₹7.17 CR' },
      { label: 'Stores', aug: '100+' },
    ],
  },
  {
    name: 'Crest Wealth',
    business: 'Fractionalized tech-enabled family office & wealth club',
    round: '₹25 CR',
    warmup: '₹75 L',
    month: "Jun'25",
    coInvestors: 'Beenext Asia, Shastra, Sparrow, DeVC',
    sector: 'Fintech',
    metrics: [{ label: 'PMS Pipeline', aug: '₹150 CR soft' }],
  },
  {
    name: 'Exiles Interactives',
    business: 'Web-based competitive browser-gaming platform (Centarius)',
    round: '₹4 CR',
    warmup: '₹50 L',
    month: "Sep'25",
    coInvestors: 'Chimera VC, IndigoEdge',
    sector: 'Gaming',
    metrics: [],
  },
];

const SECTOR_COLORS: Record<string, string> = {
  SaaS: 'bg-blue-100 text-blue-700',
  Fintech: 'bg-emerald-100 text-emerald-700',
  Consumer: 'bg-orange-100 text-orange-700',
  CleanTech: 'bg-green-100 text-green-700',
  DeepTech: 'bg-purple-100 text-purple-700',
  AgriTech: 'bg-lime-100 text-lime-700',
  HealthTech: 'bg-rose-100 text-rose-700',
  Media: 'bg-yellow-100 text-yellow-700',
  PropTech: 'bg-cyan-100 text-cyan-700',
  Construction: 'bg-amber-100 text-amber-700',
  Gaming: 'bg-violet-100 text-violet-700',
};

export function FundOnePage() {
  return (
    <div className="flex flex-col gap-8 pb-10">
      {/* ── Header ── */}
      <div className="rounded-xl border border-border bg-gradient-to-br from-surface to-surface-muted p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-ink-muted">
              Warmup Ventures
            </p>
            <h1 className="mt-1 text-2xl font-bold text-ink-heading">Fund I</h1>
            <p className="mt-0.5 text-sm text-ink-muted">Quarterly Update — Q2 FY 2026</p>
          </div>
          <Badge variant="secondary" className="text-sm">
            ₹20 CR Blind Pool + ₹30 CR Top-Up
          </Badge>
        </div>

        {/* Key stats */}
        <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
          {FUND_STATS.map((s) => (
            <div key={s.label} className="rounded-lg border border-border bg-surface p-4">
              <p className="text-xs text-ink-muted">{s.label}</p>
              <p className="mt-1 text-2xl font-bold text-brand">{s.value}</p>
              <p className="mt-0.5 text-xs text-ink-muted">{s.sub}</p>
            </div>
          ))}
        </div>
      </div>

      {/* ── Capital Summary & Deal Funnel ── */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <IndianRupee className="h-4 w-4 text-brand" aria-hidden />
              Capital Summary
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-surface-muted">
                    <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-ink-muted">
                      Particulars
                    </th>
                    <th className="px-4 py-2.5 text-right text-xs font-semibold uppercase tracking-wide text-ink-muted">
                      Q1 FY26
                    </th>
                    <th className="px-4 py-2.5 text-right text-xs font-semibold uppercase tracking-wide text-ink-muted">
                      Q2 FY26
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {CAPITAL_SUMMARY.map((row) => (
                    <tr key={row.label} className="hover:bg-surface-muted/50">
                      <td className="px-4 py-2.5 text-ink-body">{row.label}</td>
                      <td className="px-4 py-2.5 text-right text-ink-muted">{row.q1}</td>
                      <td className="px-4 py-2.5 text-right font-medium text-ink-heading">
                        {row.q2}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Layers className="h-4 w-4 text-brand" aria-hidden />
              Deal Flow Funnel (Q1 FY26)
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            {DEAL_FUNNEL.map((stage) => (
              <div key={stage.label}>
                <div className="mb-1 flex items-center justify-between text-sm">
                  <span className="text-ink-body">{stage.label}</span>
                  <span className="font-semibold text-ink-heading">
                    {stage.value.toLocaleString()}
                  </span>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-surface-muted">
                  <div
                    className="h-2 rounded-full bg-brand transition-all"
                    style={{ width: `${stage.pct}%` }}
                  />
                </div>
              </div>
            ))}
            <p className="mt-1 text-xs text-ink-muted">
              Source mix: 23.2% website · 17.6% network · 14.1% investment bankers · 10.6%
              incubators
            </p>
          </CardContent>
        </Card>
      </div>

      {/* ── Portfolio Companies ── */}
      <div>
        <div className="mb-4 flex items-center gap-2">
          <BarChart3 className="h-5 w-5 text-brand" aria-hidden />
          <h2 className="text-lg font-semibold text-ink-heading">
            Portfolio — 18 Investments Closed
          </h2>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {PORTFOLIO.map((co) => (
            <div
              key={co.name}
              className="flex flex-col gap-3 rounded-xl border border-border bg-surface p-4 transition-shadow hover:shadow-md"
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <h3 className="font-semibold text-ink-heading">{co.name}</h3>
                  <p className="mt-0.5 text-xs text-ink-muted">{co.month}</p>
                </div>
                {co.sector ? (
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-medium ${SECTOR_COLORS[co.sector] ?? 'bg-surface-muted text-ink-muted'}`}
                  >
                    {co.sector}
                  </span>
                ) : null}
              </div>

              <p className="text-sm text-ink-body leading-relaxed">{co.business}</p>

              {/* Investment */}
              <div className="flex gap-4 border-t border-border pt-3 text-xs">
                <div>
                  <p className="text-ink-muted">Round</p>
                  <p className="font-medium text-ink-heading">{co.round}</p>
                </div>
                <div>
                  <p className="text-ink-muted">Warmup</p>
                  <p className="font-medium text-brand">{co.warmup}</p>
                </div>
              </div>

              {/* Metrics */}
              {co.metrics && co.metrics.length > 0 ? (
                <div className="flex flex-wrap gap-3 rounded-lg bg-surface-muted px-3 py-2">
                  {co.metrics.map((m) => (
                    <div key={m.label} className="text-xs">
                      <span className="text-ink-muted">{m.label}: </span>
                      <span className="font-semibold text-ink-heading">{m.aug}</span>
                    </div>
                  ))}
                </div>
              ) : null}

              {/* Co-investors */}
              <p className="text-xs text-ink-muted">
                <span className="font-medium">Co-investors: </span>
                {co.coInvestors}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* ── Revenue Growth ── */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <TrendingUp className="h-4 w-4 text-brand" aria-hidden />
            Portfolio Revenue Growth (at commitment → Jul 2025)
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-surface-muted">
                  <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-ink-muted">
                    Company
                  </th>
                  <th className="px-4 py-2.5 text-right text-xs font-semibold uppercase tracking-wide text-ink-muted">
                    At commitment
                  </th>
                  <th className="px-4 py-2.5 text-right text-xs font-semibold uppercase tracking-wide text-ink-muted">
                    As of Jul 2025
                  </th>
                  <th className="px-4 py-2.5 text-right text-xs font-semibold uppercase tracking-wide text-ink-muted">
                    Growth
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {[
                  { name: 'BobaBhai', commit: '₹80.98 L', now: '₹4.96 CR', growth: '611.92%' },
                  {
                    name: 'Nitro Commerce',
                    commit: '₹40.34 L',
                    now: '₹2.12 CR',
                    growth: '425.10%',
                  },
                  { name: 'Rocketpay', commit: '₹5.21 L', now: '₹78.02 L', growth: '1498.84%' },
                  { name: 'Datoms', commit: '₹25.66 L', now: '₹57.50 L', growth: '224.14%' },
                  { name: 'BIVA Analytics', commit: '₹6.41 L', now: '₹24.04 L', growth: '374.88%' },
                ].map((r) => (
                  <tr key={r.name} className="hover:bg-surface-muted/50">
                    <td className="px-4 py-2.5 font-medium text-ink-heading">{r.name}</td>
                    <td className="px-4 py-2.5 text-right text-ink-muted">{r.commit}</td>
                    <td className="px-4 py-2.5 text-right text-ink-heading">{r.now}</td>
                    <td className="px-4 py-2.5 text-right font-semibold text-brand">{r.growth}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* ── Team ── */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Users className="h-4 w-4 text-brand" aria-hidden />
            Warmup Team
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {[
              {
                name: 'Sharad Bansal',
                role: 'Co-Founder & Managing Partner',
                bg: 'IIT Delhi, Co-Founder Tinkerly',
              },
              {
                name: 'Yogesh Chaudhary',
                role: 'Founding Partner',
                bg: 'Director & Owner, Jaipur Rugs',
              },
              {
                name: 'Rajendra Lora',
                role: 'Founding Partner',
                bg: 'Co-Founder & CEO, Freshokartz',
              },
              { name: 'Nikhil Mishra', role: 'VP – Investments', bg: '' },
            ].map((p) => (
              <div key={p.name} className="rounded-lg border border-border p-3">
                <p className="font-medium text-ink-heading">{p.name}</p>
                <p className="text-xs text-brand">{p.role}</p>
                {p.bg ? <p className="mt-1 text-xs text-ink-muted">{p.bg}</p> : null}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
