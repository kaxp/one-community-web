import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TrendingUp, Users, Rocket, Layers, ShieldCheck } from 'lucide-react';

// ── Data from Q3 FY 2026 quarterly report ─────────────────────────────────────

const FUND_STATS = [
  { label: 'Corpus', value: '₹300 CR', sub: '₹150 CR + ₹150 CR green shoe' },
  { label: 'Investments in Q2', value: '4', sub: '1 in Q1 · 5 total' },
  { label: 'Capital Committed Q2', value: '₹15.6 CR', sub: '₹4.5 CR in Q1' },
  { label: 'Target Portfolio', value: '25–30', sub: 'Seed → Series A' },
];

const CAPITAL_SUMMARY = [
  { label: 'Corpus', q1: '₹150 CR + ₹150 CR Green Shoe', q2: '₹150 CR + ₹150 CR Green Shoe' },
  { label: 'Investments committed', q1: '1', q2: '4' },
  { label: 'Capital committed to startups', q1: '₹4.5 CR', q2: '₹15.6 CR' },
];

const THESIS_PILLARS = [
  {
    icon: '₹',
    title: 'Cheque Size',
    detail: '₹4 CR – ₹6 CR initial; ₹8–10 CR follow-on',
    sub: 'Target ownership ≥ 5%',
  },
  {
    icon: '🌱',
    title: 'Early Stage',
    detail: 'Seed to Series A',
    sub: 'Valuation up to ₹80 CR at entry',
  },
  {
    icon: '🔭',
    title: 'Sector Agnostic',
    detail: 'Exceptional founders + scalable innovation',
    sub: 'Frontier tech, consumer, SaaS',
  },
  {
    icon: '💻',
    title: 'Tech-Focused',
    detail: 'Innovation-driven companies',
    sub: 'Solving real-world challenges at scale',
  },
];

interface Investment {
  name: string;
  business: string;
  round: string;
  warmup: string;
  coInvestors: string;
  status: string;
  metrics: { label: string; value: string }[];
  sector?: string;
}

const INVESTMENTS: Investment[] = [
  {
    name: 'Olee Space',
    business:
      'Advanced satellite deployer systems and in-orbit solutions — improving reliability, payload efficiency, and turnaround time of satellite launches',
    round: '₹23 CR',
    warmup: '₹4.50 CR',
    coInvestors: 'Rockstud Capital, SIDBI Ventures, BIG Capital, PointOne Capital',
    status: 'In Process',
    sector: 'SpaceTech',
    metrics: [
      { label: 'Milestone', value: 'LoRa systems field-tested; ₹3 L advance received' },
      { label: 'Collaborations', value: 'MIT Manipal, GITAM, IIT Bombay, NIT Surat' },
    ],
  },
  {
    name: 'Zippy',
    business:
      'Screen-free AI companion for kids — smart physical toy + interactive cards for personalized audio stories and learning, no screens',
    round: '₹11.2 CR',
    warmup: '₹2 CR',
    coInvestors: '12Flags Group, Ventana Ventures, Ruvento Ventures',
    status: 'In Process',
    sector: 'EdTech',
    metrics: [
      { label: 'Device price', value: '₹5,000 with playsets' },
      { label: 'Subscription', value: '₹250–300/mo recurring' },
      { label: 'ICP', value: '13–15M India-1 families (0–7 yrs)' },
    ],
  },
  {
    name: 'ONYC',
    business:
      'D2C kids footwear brand — ergonomic, lightweight, affordable shoes for children aged 0–10 years; in-house manufacturing',
    round: '~₹8 CR',
    warmup: '₹5 CR',
    coInvestors: 'TBD',
    status: 'In Process',
    sector: 'D2C',
    metrics: [
      { label: 'MRR (Oct)', value: '₹2.4 CR (60–65% gross margin)' },
      { label: 'Orders/day', value: '3,000+ (40% D2C + 50% marketplace)' },
      { label: 'Repeat rate', value: '30–34% · CAC ₹160–190' },
    ],
  },
  {
    name: 'Babai Tiffins',
    business:
      'Authentic regional QSR chain serving traditional Andhra-style breakfasts, lunch, dinner — owned outlets + delivery-first kitchens',
    round: '₹11–12 CR',
    warmup: '₹6–6.5 CR',
    coInvestors: 'CDM Capital',
    status: 'In Process',
    sector: 'Consumer',
    metrics: [
      { label: 'MRR', value: '₹4 CR · 180K+ monthly orders' },
      { label: 'Repeat customers', value: '70%' },
      { label: 'Channel mix', value: '57% offline / 43% online · AOV ₹198' },
    ],
  },
  {
    name: 'KLYM',
    business:
      "AI-first skin health & cosmetic intelligence platform — product-neutral 'AI cosmetologist' guiding users on routines, products, and cosmetic procedures",
    round: '₹3–4 CR',
    warmup: '₹2.10 CR',
    coInvestors: 'TBD',
    status: 'In Process',
    sector: 'HealthTech',
    metrics: [
      { label: 'MAU (Nov)', value: '9,570 · 49% repeat users' },
      { label: 'App downloads', value: '31,789' },
      { label: 'Clinic orders', value: '108 fulfilled (20% take rate)' },
    ],
  },
];

const SECTOR_COLORS: Record<string, string> = {
  SpaceTech: 'bg-indigo-100 text-indigo-700',
  EdTech: 'bg-blue-100 text-blue-700',
  D2C: 'bg-orange-100 text-orange-700',
  Consumer: 'bg-amber-100 text-amber-700',
  HealthTech: 'bg-rose-100 text-rose-700',
};

const FUND_TERMS = [
  { label: 'Investment period', value: '36 months + 2-year extension' },
  { label: 'Fund life', value: '9 years' },
  { label: 'Management fees', value: '2% p.a. for fund tenure' },
  { label: 'Carry rate', value: '20%' },
  { label: 'Hurdle rate', value: '10%' },
  { label: 'Min. commitment', value: '₹1 CR (6 half-yearly drawdowns)' },
  { label: 'Structure', value: 'Category 2 AIF' },
  { label: 'Exit target', value: '5–8× at 25–30% gross IRR (Series B+ secondary)' },
];

export function FundTwoPage() {
  return (
    <div className="flex flex-col gap-8 pb-10">
      {/* ── Header ── */}
      <div className="rounded-xl border border-border bg-gradient-to-br from-surface to-surface-muted p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-ink-muted">
              Warmup Ventures
            </p>
            <h1 className="mt-1 text-2xl font-bold text-ink-heading">Fund II</h1>
            <p className="mt-0.5 text-sm text-ink-muted">Quarterly Update — Q3 FY 2026</p>
          </div>
          <Badge variant="secondary" className="text-sm">
            First drawdown complete · Sep&apos;25
          </Badge>
        </div>

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

      {/* ── Capital Summary & Fund Terms ── */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Layers className="h-4 w-4 text-brand" aria-hidden />
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
              <ShieldCheck className="h-4 w-4 text-brand" aria-hidden />
              Fund Terms
            </CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-x-6 gap-y-3">
            {FUND_TERMS.map((t) => (
              <div key={t.label}>
                <p className="text-xs text-ink-muted">{t.label}</p>
                <p className="text-sm font-medium text-ink-heading">{t.value}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* ── Investment Thesis ── */}
      <div>
        <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-ink-heading">
          <Rocket className="h-5 w-5 text-brand" aria-hidden />
          Investment Thesis
        </h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {THESIS_PILLARS.map((p) => (
            <div
              key={p.title}
              className="rounded-xl border border-border bg-surface p-5 transition-shadow hover:shadow-md"
            >
              <div className="mb-3 text-2xl">{p.icon}</div>
              <h3 className="font-semibold text-ink-heading">{p.title}</h3>
              <p className="mt-1.5 text-sm text-ink-body">{p.detail}</p>
              <p className="mt-1 text-xs text-ink-muted">{p.sub}</p>
            </div>
          ))}
        </div>
      </div>

      {/* ── Investments in Progress ── */}
      <div>
        <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-ink-heading">
          <TrendingUp className="h-5 w-5 text-brand" aria-hidden />
          Investments in Progress (5)
        </h2>
        <div className="flex flex-col gap-4">
          {INVESTMENTS.map((inv) => (
            <div
              key={inv.name}
              className="rounded-xl border border-border bg-surface p-5 transition-shadow hover:shadow-md"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-base font-semibold text-ink-heading">{inv.name}</h3>
                    {inv.sector ? (
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs font-medium ${SECTOR_COLORS[inv.sector] ?? 'bg-surface-muted text-ink-muted'}`}
                      >
                        {inv.sector}
                      </span>
                    ) : null}
                    <Badge variant="outline" className="text-xs">
                      {inv.status}
                    </Badge>
                  </div>
                  <p className="mt-1 text-sm text-ink-body">{inv.business}</p>
                </div>
                <div className="flex shrink-0 gap-6 text-sm">
                  <div>
                    <p className="text-xs text-ink-muted">Round</p>
                    <p className="font-medium text-ink-heading">{inv.round}</p>
                  </div>
                  <div>
                    <p className="text-xs text-ink-muted">Warmup</p>
                    <p className="font-medium text-brand">{inv.warmup}</p>
                  </div>
                </div>
              </div>

              {inv.metrics.length > 0 ? (
                <div className="mt-4 flex flex-wrap gap-4 rounded-lg bg-surface-muted px-4 py-3">
                  {inv.metrics.map((m) => (
                    <div key={m.label} className="text-xs">
                      <span className="text-ink-muted">{m.label}: </span>
                      <span className="font-semibold text-ink-heading">{m.value}</span>
                    </div>
                  ))}
                </div>
              ) : null}

              <p className="mt-3 text-xs text-ink-muted">
                <span className="font-medium">Co-investors: </span>
                {inv.coInvestors}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* ── Team ── */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Users className="h-4 w-4 text-brand" aria-hidden />
            Warmup Team
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            {[
              { name: 'Sharad Bansal', role: 'Co-Founder & Managing Partner' },
              { name: 'Yogesh Chaudhary', role: 'Founding Partner' },
              { name: 'Rajendra Lora', role: 'Founding Partner' },
              { name: 'Nikhil Mishra', role: 'VP – Investments' },
              { name: 'Lavanya Manmotra', role: 'Investor Relations' },
            ].map((p) => (
              <div key={p.name} className="rounded-lg border border-border p-3">
                <p className="font-medium text-ink-heading">{p.name}</p>
                <p className="text-xs text-brand">{p.role}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
