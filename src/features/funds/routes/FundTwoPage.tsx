import { useEffect, useRef, useState } from 'react';
import { useIsMobile } from '@/lib/hooks/use-is-mobile';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Cell,
  PieChart,
  Pie,
  ResponsiveContainer,
  LabelList,
} from 'recharts';

// Color palette
const BG = '#0f172a';
const SURFACE = '#1e293b';
const MUTED = '#334155';
const BLUE = '#2563eb';
const CYAN = '#06b6d4';
const ORANGE = '#f97316';
const GREEN = '#10b981';
const AMBER = '#f59e0b';
const PURPLE = '#a855f7';
const TEXT_PRIMARY = '#f1f5f9';
const TEXT_MUTED = '#94a3b8';

// Source inbound data
const sourceData = [
  { source: 'Mail Inbound', count: 300, pct: '41.2%' },
  { source: 'Website', count: 230, pct: '31.6%' },
  { source: 'Network', count: 68, pct: '9.3%' },
  { source: 'Bankers', count: 55, pct: '7.6%' },
  { source: 'Own Research', count: 50, pct: '6.9%' },
  { source: 'Events & Partnerships', count: 25, pct: '3.4%' },
];

const dealStatusData = [
  { name: 'Deployed', value: 2 },
  { name: 'Pipeline', value: 3 },
];

const PIE_COLORS = [GREEN, BLUE];

// Animated counter hook
function useAnimatedCounter(target: number, duration = 1500, active = true) {
  const [value, setValue] = useState(0);
  useEffect(() => {
    if (!active) return;
    let start: number | null = null;
    const step = (ts: number) => {
      if (start === null) start = ts;
      const progress = Math.min((ts - start) / duration, 1);
      setValue(Math.floor(progress * target));
      if (progress < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }, [target, duration, active]);
  return value;
}

// IntersectionObserver hook
function useInView(threshold = 0.2) {
  const ref = useRef<HTMLDivElement>(null);
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          setInView(true);
          observer.disconnect();
        }
      },
      { threshold },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [threshold]);
  return { ref, inView };
}

// Hero counter item
function HeroCounter({
  target,
  label,
  suffix = '',
  active,
}: {
  target: number;
  label: string;
  suffix?: string;
  active: boolean;
}) {
  const val = useAnimatedCounter(target, 1500, active);
  return (
    <div
      style={{
        textAlign: 'center',
        padding: '24px 32px',
        background: SURFACE,
        borderRadius: 16,
        flex: '1 1 160px',
        minWidth: 140,
      }}
    >
      <div
        style={{
          fontSize: 48,
          fontWeight: 800,
          color: CYAN,
          lineHeight: 1,
          fontVariantNumeric: 'tabular-nums',
        }}
      >
        {val}
        {suffix}
      </div>
      <div style={{ color: TEXT_MUTED, fontSize: 13, marginTop: 8, fontWeight: 500 }}>{label}</div>
    </div>
  );
}

// Founders card
function FounderCard({ name, detail }: { name: string; detail: string }) {
  return (
    <div
      style={{
        background: MUTED,
        borderRadius: 10,
        padding: '14px 16px',
        flex: '1 1 200px',
        minWidth: 180,
      }}
    >
      <div style={{ color: TEXT_PRIMARY, fontWeight: 700, fontSize: 14 }}>{name}</div>
      <div style={{ color: TEXT_MUTED, fontSize: 12, marginTop: 4 }}>{detail}</div>
    </div>
  );
}

// Business update item
function BizUpdate({ title, badge, desc }: { title: string; badge: string; desc: string }) {
  return (
    <div
      style={{
        paddingLeft: 14,
        marginBottom: 18,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
        <span style={{ color: TEXT_PRIMARY, fontWeight: 700, fontSize: 14 }}>{title}</span>
        <span
          style={{
            background: MUTED,
            color: CYAN,
            fontSize: 11,
            borderRadius: 6,
            padding: '2px 8px',
            fontWeight: 600,
          }}
        >
          {badge}
        </span>
      </div>
      <div style={{ color: TEXT_MUTED, fontSize: 13, marginTop: 4 }}>{desc}</div>
    </div>
  );
}

// Value prop item
function ValueProp({ label }: { label: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
      <span style={{ color: CYAN, fontSize: 18 }}>&#9670;</span>
      <span style={{ color: TEXT_PRIMARY, fontSize: 14 }}>{label}</span>
    </div>
  );
}

// Checkmark item
function CheckItem({ label }: { label: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 10 }}>
      <span style={{ color: GREEN, fontSize: 18, lineHeight: 1.2 }}>&#10003;</span>
      <span style={{ color: TEXT_PRIMARY, fontSize: 14 }}>{label}</span>
    </div>
  );
}

// Pill chip
function Pill({ name, company }: { name: string; company?: string }) {
  return (
    <div
      style={{
        background: MUTED,
        borderRadius: 20,
        padding: '7px 14px',
        display: 'inline-flex',
        alignItems: 'center',
        gap: 5,
        margin: '4px',
      }}
    >
      <span style={{ color: TEXT_PRIMARY, fontWeight: 700, fontSize: 13 }}>{name}</span>
      {company != null && company !== '' && (
        <span style={{ color: TEXT_MUTED, fontSize: 12 }}>({company})</span>
      )}
    </div>
  );
}

// Team founder card
function TeamFounderCard({
  initials,
  name,
  title,
  details,
  delay,
}: {
  initials: string;
  name: string;
  title: string;
  details: string[];
  delay: number;
}) {
  return (
    <div
      style={{
        background: SURFACE,
        borderRadius: 16,
        padding: 24,
        flex: '1 1 280px',
        minWidth: 260,
        animation: 'fadeInUp 0.45s ease-out both',
        animationDelay: `${delay}ms`,
      }}
    >
      <div
        style={{
          width: 56,
          height: 56,
          borderRadius: '50%',
          background: `linear-gradient(135deg, ${BLUE}, ${CYAN})`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 22,
          fontWeight: 800,
          color: '#fff',
          marginBottom: 16,
        }}
      >
        {initials}
      </div>
      <div style={{ color: TEXT_PRIMARY, fontWeight: 700, fontSize: 18 }}>{name}</div>
      <div style={{ color: CYAN, fontSize: 13, marginBottom: 12 }}>{title}</div>
      {details.map((d) => (
        <div key={d} style={{ color: TEXT_MUTED, fontSize: 13, marginBottom: 6, lineHeight: 1.5 }}>
          {d}
        </div>
      ))}
    </div>
  );
}

// Team member card
function TeamMemberCard({ name, role, delay }: { name: string; role: string; delay: number }) {
  return (
    <div
      style={{
        background: SURFACE,
        borderRadius: 12,
        padding: 20,
        flex: '1 1 200px',
        minWidth: 180,
        animation: 'fadeInUp 0.45s ease-out both',
        animationDelay: `${delay}ms`,
      }}
    >
      <div
        style={{
          width: 40,
          height: 40,
          borderRadius: '50%',
          background: MUTED,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 16,
          fontWeight: 700,
          color: CYAN,
          marginBottom: 12,
        }}
      >
        {name
          .split(' ')
          .map((w) => (w[0] ?? '').toUpperCase())
          .slice(0, 2)
          .join('')}
      </div>
      <div style={{ color: TEXT_PRIMARY, fontWeight: 700, fontSize: 15 }}>{name}</div>
      <div style={{ color: TEXT_MUTED, fontSize: 13 }}>{role}</div>
    </div>
  );
}

export function FundTwoPage() {
  const heroRef = useRef<HTMLDivElement>(null);
  const [heroInView, setHeroInView] = useState(false);
  const isMobile = useIsMobile();

  useEffect(() => {
    const el = heroRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          setHeroInView(true);
          observer.disconnect();
        }
      },
      { threshold: 0.1 },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const { ref: funnelRef, inView: funnelInView } = useInView(0.2);
  const chartData = funnelInView ? sourceData : sourceData.map((d) => ({ ...d, count: 0 }));

  // Custom bar label
  const renderBarLabel = (props: unknown) => {
    const p = props as {
      x?: number;
      y?: number;
      width?: number;
      height?: number;
      value?: unknown;
    };
    const v = p.value;
    if (typeof v !== 'number' || v === 0) return null;
    const x = (p.x ?? 0) + (p.width ?? 0) + 6;
    const y = (p.y ?? 0) + (p.height ?? 0) / 2 + 4;
    return (
      <text x={x} y={y} fill={TEXT_MUTED} fontSize={12}>
        {v}
      </text>
    );
  };

  return (
    <div style={{ background: BG, minHeight: '100vh', color: TEXT_PRIMARY, fontFamily: 'inherit' }}>
      <style>{`
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(24px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>

      {/* 1. Sticky Header — zIndex kept below mobile drawer overlay (Radix Sheet z-50) */}
      <div
        style={{
          position: 'sticky',
          top: 0,
          zIndex: 10,
          backdropFilter: 'blur(16px)',
          background: 'rgba(15,23,42,0.85)',
          borderBottom: `1px solid ${MUTED}`,
          padding: '12px 20px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 8,
        }}
      >
        <div style={{ fontWeight: 700, fontSize: 16, color: TEXT_PRIMARY }}>
          Warmup Ventures | Fund II: Q4 FY2026
        </div>
        <div
          style={{
            background: 'rgba(249,115,22,0.15)',
            border: `1px solid ${ORANGE}`,
            color: ORANGE,
            borderRadius: 8,
            padding: '4px 14px',
            fontSize: 12,
            fontWeight: 600,
          }}
        >
          Confidential: For LP Use Only
        </div>
      </div>

      <div
        style={{
          maxWidth: 1200,
          margin: '0 auto',
          padding: isMobile ? '0 16px 60px' : '0 24px 60px',
        }}
      >
        {/* 2. Hero Strip */}
        <div ref={heroRef} style={{ paddingTop: 48, paddingBottom: 48 }}>
          <div style={{ textAlign: 'center', marginBottom: 12 }}>
            <span
              style={{
                background: 'rgba(6,182,212,0.12)',
                color: CYAN,
                borderRadius: 8,
                padding: '4px 14px',
                fontSize: 12,
                fontWeight: 600,
              }}
            >
              Fund II - Q4 FY2026 Snapshot
            </span>
          </div>
          <h1
            style={{
              textAlign: 'center',
              // RESPONSIVE: reduce font size on mobile
              fontSize: isMobile ? 24 : 36,
              fontWeight: 800,
              color: TEXT_PRIMARY,
              marginBottom: 8,
            }}
          >
            Warmup Ventures Fund II
          </h1>
          <p
            style={{
              textAlign: 'center',
              color: TEXT_MUTED,
              fontSize: isMobile ? 13 : 16,
              marginBottom: 36,
            }}
          >
            Seed to Series-A - INR 4 to 7 Cr per startup
          </p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16, justifyContent: 'center' }}>
            <HeroCounter target={30} label="Target IRR" suffix="%" active={heroInView} />
            <HeroCounter target={728} label="Q4 Startups Reviewed" active={heroInView} />
            <HeroCounter target={2} label="Investments Deployed" active={heroInView} />
            <HeroCounter target={30} label="Portfolio Size Target" suffix="+" active={heroInView} />
            <HeroCounter target={3} label="Pipeline Deals" active={heroInView} />
          </div>
        </div>

        {/* 3. Thesis Overview */}
        <section style={{ marginBottom: 64 }}>
          <h2
            style={{
              fontSize: 'clamp(1.1rem, 3vw, 1.625rem)',
              fontWeight: 700,
              color: TEXT_PRIMARY,
              marginBottom: 24,
            }}
          >
            Investment Thesis
          </h2>
          <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap' }}>
            {/* Financial Capital */}
            <div
              style={{
                background: SURFACE,
                borderRadius: 16,
                padding: 28,
                flex: '1 1 320px',
                animation: 'fadeInUp 0.45s ease-out both',
                animationDelay: '0ms',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
                <span style={{ fontSize: 24 }}>&#128178;</span>
                <span style={{ color: CYAN, fontWeight: 700, fontSize: 18 }}>
                  Financial Capital
                </span>
              </div>
              <div style={{ marginBottom: 10 }}>
                <span style={{ color: TEXT_MUTED, fontSize: 13 }}>Investment Range</span>
                <div style={{ color: TEXT_PRIMARY, fontWeight: 700, fontSize: 15, marginTop: 2 }}>
                  INR 4-7 Cr per startup
                </div>
              </div>
              <div style={{ marginBottom: 10 }}>
                <span style={{ color: TEXT_MUTED, fontSize: 13 }}>Stage Focus</span>
                <div style={{ color: TEXT_PRIMARY, fontWeight: 700, fontSize: 15, marginTop: 2 }}>
                  Seed to Series-A
                </div>
              </div>
              <div style={{ marginBottom: 10 }}>
                <span style={{ color: TEXT_MUTED, fontSize: 13 }}>Portfolio Size Target</span>
                <div style={{ color: TEXT_PRIMARY, fontWeight: 700, fontSize: 15, marginTop: 2 }}>
                  25-30 startups
                </div>
              </div>
              <div style={{ marginBottom: 10 }}>
                <span style={{ color: TEXT_MUTED, fontSize: 13 }}>Target IRR</span>
                <div style={{ color: CYAN, fontWeight: 800, fontSize: 22, marginTop: 2 }}>30%</div>
              </div>
              <div
                style={{
                  marginTop: 16,
                  borderTop: `1px solid ${MUTED}`,
                  paddingTop: 16,
                }}
              >
                <div style={{ color: TEXT_MUTED, fontSize: 13, marginBottom: 6 }}>
                  - Reserved follow-on capital for mature portfolio companies
                </div>
                <div style={{ color: TEXT_MUTED, fontSize: 13 }}>
                  - Hybrid strategy: core sectors + high-conviction opportunistic investments
                </div>
              </div>
            </div>

            {/* Human Capital */}
            <div
              style={{
                background: SURFACE,
                borderRadius: 16,
                padding: 28,
                flex: '1 1 320px',
                animation: 'fadeInUp 0.45s ease-out both',
                animationDelay: '100ms',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
                <span style={{ fontSize: 24 }}>&#129309;</span>
                <span style={{ color: AMBER, fontWeight: 700, fontSize: 18 }}>
                  Human Capital - Founder-First Approach
                </span>
              </div>
              <CheckItem label="Strategic and operational resources" />
              <CheckItem label="Technology and network access" />
              <CheckItem label="Product and marketing support" />
              <CheckItem label="Fundraising assistance" />
            </div>
          </div>
          <div
            style={{
              textAlign: 'center',
              marginTop: 24,
              color: TEXT_MUTED,
              fontSize: 14,
              fontStyle: 'italic',
            }}
          >
            &ldquo;We employ a hybrid strategy to maximize fund returns, focusing on three core
            sectors, while remaining open to high-conviction opportunistic investments&rdquo;
          </div>
        </section>

        {/* 4. Focus Areas */}
        <section style={{ marginBottom: 64 }}>
          <h2
            style={{
              fontSize: 'clamp(1.1rem, 3vw, 1.625rem)',
              fontWeight: 700,
              color: TEXT_PRIMARY,
              marginBottom: 24,
            }}
          >
            Focus Areas
          </h2>
          <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap' }}>
            {/* Deep-Tech */}
            <div
              style={{
                background: SURFACE,
                borderRadius: 16,
                padding: 24,
                flex: '1 1 280px',
                animation: 'fadeInUp 0.45s ease-out both',
                animationDelay: '0ms',
              }}
            >
              <div style={{ color: CYAN, fontWeight: 700, fontSize: 17, marginBottom: 12 }}>
                Deep-Tech and Frontier-Tech
              </div>
              {[
                'AI',
                'Semiconductors',
                'Spacetech',
                'Defense tech',
                'Quantum computing',
                'Blockchain',
              ].map((item) => (
                <div
                  key={item}
                  style={{
                    color: TEXT_MUTED,
                    fontSize: 13,
                    marginBottom: 4,
                    paddingLeft: 12,
                  }}
                >
                  - {item}
                </div>
              ))}
              <div
                style={{
                  marginTop: 14,
                  color: TEXT_MUTED,
                  fontSize: 12,
                  fontStyle: 'italic',
                  borderTop: `1px solid ${MUTED}`,
                  paddingTop: 12,
                }}
              >
                &ldquo;Businesses with IP-driven models, high entry barriers, and defensible
                moats&rdquo;
              </div>
            </div>

            {/* Climate-Tech */}
            <div
              style={{
                background: SURFACE,
                borderRadius: 16,
                padding: 24,
                flex: '1 1 280px',
                animation: 'fadeInUp 0.45s ease-out both',
                animationDelay: '100ms',
              }}
            >
              <div style={{ color: GREEN, fontWeight: 700, fontSize: 17, marginBottom: 12 }}>
                Climate-Tech and Sustainability
              </div>
              {[
                'Renewable energy',
                'Energy storage',
                'Recycling',
                'Waste management',
                'Carbon credits',
                'ESG solutions',
              ].map((item) => (
                <div
                  key={item}
                  style={{ color: TEXT_MUTED, fontSize: 13, marginBottom: 4, paddingLeft: 12 }}
                >
                  - {item}
                </div>
              ))}
              <div
                style={{
                  marginTop: 14,
                  color: TEXT_MUTED,
                  fontSize: 12,
                  fontStyle: 'italic',
                  borderTop: `1px solid ${MUTED}`,
                  paddingTop: 12,
                }}
              >
                &ldquo;Scalable impact solutions with robust business models aligned with net-zero
                goals&rdquo;
              </div>
            </div>

            {/* D2C */}
            <div
              style={{
                background: SURFACE,
                borderRadius: 16,
                padding: 24,
                flex: '1 1 280px',
                animation: 'fadeInUp 0.45s ease-out both',
                animationDelay: '200ms',
              }}
            >
              <div style={{ color: ORANGE, fontWeight: 700, fontSize: 17, marginBottom: 12 }}>
                D2C Enabler Platforms
              </div>
              {[
                'Scalable Infrastructure for Rapid D2C Growth',
                'Cost Efficiency with Targeted Marketing',
                'End-to-End Solutions to Streamline Operations',
              ].map((item) => (
                <div
                  key={item}
                  style={{ color: TEXT_MUTED, fontSize: 13, marginBottom: 4, paddingLeft: 12 }}
                >
                  - {item}
                </div>
              ))}
              <div
                style={{
                  marginTop: 14,
                  color: TEXT_MUTED,
                  fontSize: 12,
                  fontStyle: 'italic',
                  borderTop: `1px solid ${MUTED}`,
                  paddingTop: 12,
                }}
              >
                &ldquo;Tech platforms enabling D2C brands to scale efficiently&rdquo;
              </div>
            </div>
          </div>
        </section>

        {/* 5. Startups Funnel */}
        <section ref={funnelRef} style={{ marginBottom: 64 }}>
          <h2
            style={{
              fontSize: 'clamp(1.1rem, 3vw, 1.625rem)',
              fontWeight: 700,
              color: TEXT_PRIMARY,
              marginBottom: 24,
            }}
          >
            Q4 Pipeline: Source-Wise Inbound
          </h2>
          <div style={{ display: 'flex', gap: 32, flexWrap: 'wrap', alignItems: 'center' }}>
            {/* Big stat */}
            <div style={{ textAlign: 'center', minWidth: 160 }}>
              <div
                style={{
                  width: 140,
                  height: 140,
                  borderRadius: '50%',
                  border: `4px solid ${CYAN}`,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 12px',
                  background: 'rgba(6,182,212,0.08)',
                }}
              >
                <div style={{ color: CYAN, fontSize: 40, fontWeight: 800 }}>728</div>
                <div style={{ color: TEXT_MUTED, fontSize: 11 }}>Startups Reviewed</div>
              </div>
              <div style={{ color: TEXT_MUTED, fontSize: 13 }}>Q4 FY2026 Total Pipeline</div>
            </div>

            {/* Bar chart */}
            <div style={{ flex: 1, minWidth: 300, height: 260 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  layout="vertical"
                  data={chartData}
                  margin={{ top: 0, right: 60, left: 10, bottom: 0 }}
                >
                  <XAxis type="number" hide />
                  <YAxis
                    type="category"
                    dataKey="source"
                    tick={{ fill: TEXT_MUTED, fontSize: 12 }}
                    width={140}
                  />
                  <Tooltip
                    formatter={(v) => [`${v ?? ''} startups`, 'Count']}
                    contentStyle={{
                      background: SURFACE,
                      border: `1px solid ${MUTED}`,
                      borderRadius: 8,
                      color: TEXT_PRIMARY,
                    }}
                  />
                  <Bar
                    dataKey="count"
                    fill={CYAN}
                    radius={[0, 4, 4, 0]}
                    isAnimationActive={funnelInView}
                    animationDuration={1200}
                  >
                    {chartData.map((_, i) => (
                      <Cell key={i} fill={CYAN ?? CYAN} />
                    ))}
                    <LabelList content={renderBarLabel} />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Deal status donut */}
            <div style={{ minWidth: 180, textAlign: 'center' }}>
              <div style={{ color: TEXT_MUTED, fontSize: 13, marginBottom: 8 }}>Deal Status</div>
              <ResponsiveContainer width={160} height={160}>
                <PieChart>
                  <Pie
                    data={dealStatusData}
                    cx="50%"
                    cy="50%"
                    innerRadius={45}
                    outerRadius={70}
                    dataKey="value"
                    isAnimationActive
                    animationDuration={1200}
                    label={(props) => {
                      const n = props.name as string | undefined;
                      const val = props.value as number | undefined;
                      return n != null && val != null ? `${n}: ${val}` : '';
                    }}
                    labelLine={false}
                  >
                    {dealStatusData.map((_, i) => (
                      <Cell key={i} fill={PIE_COLORS[i] ?? CYAN} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(v) => [`${v ?? ''}`, 'Deals']}
                    contentStyle={{
                      background: SURFACE,
                      border: `1px solid ${MUTED}`,
                      borderRadius: 8,
                      color: TEXT_PRIMARY,
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div style={{ display: 'flex', gap: 12, justifyContent: 'center', marginTop: 4 }}>
                <span style={{ color: GREEN, fontSize: 12 }}>&#9632; Deployed (2)</span>
                <span style={{ color: BLUE, fontSize: 12 }}>&#9632; Pipeline (3)</span>
              </div>
            </div>
          </div>

          {/* Management Insight */}
          <div
            style={{
              marginTop: 24,
              border: `1px solid ${ORANGE}`,
              borderRadius: 12,
              padding: '16px 20px',
              background: 'rgba(249,115,22,0.06)',
            }}
          >
            <div style={{ color: ORANGE, fontWeight: 700, fontSize: 13, marginBottom: 6 }}>
              Management Insight
            </div>
            <div style={{ color: TEXT_MUTED, fontSize: 14 }}>
              &ldquo;Although Network (68) and Own research (50) contribute a smaller share of total
              reviewed startups, they continue to generate the highest quality opportunities in the
              pipeline.&rdquo;
            </div>
          </div>
        </section>

        {/* 6. Portfolio Deals */}
        <section style={{ marginBottom: 64 }}>
          <h2
            style={{
              fontSize: 'clamp(1.1rem, 3vw, 1.625rem)',
              fontWeight: 700,
              color: TEXT_PRIMARY,
              marginBottom: 24,
            }}
          >
            Portfolio Deals
          </h2>
          {(() => {
            const deals = [
              {
                deal: 'Olee Space',
                sector: 'Space-Tech',
                roundSize: 'Rs 23 Crores',
                coInvestors: 'Rockstud Capital, BIG Capital',
                desc: 'Space tech infrastructure and orbital services',
                status: 'Deployed',
              },
              {
                deal: 'Wippi (formerly Zippy)',
                sector: 'AI Toys',
                roundSize: 'Rs 9 Crores',
                coInvestors: '12Flags VC',
                desc: 'Phygital AI companion for kids',
                status: 'Deployed',
              },
              {
                deal: 'Deal 3',
                sector: 'Semiconductors',
                roundSize: 'Confidential',
                coInvestors: 'Tier 1 VC',
                desc: 'Full stack electronics manufacturing and engineering company',
                status: 'Pipeline',
              },
              {
                deal: 'Deal 4',
                sector: 'Risk Intelligence',
                roundSize: 'Confidential',
                coInvestors: 'Growth VCs',
                desc: 'Real estate collateral digitisation for banks and FIs credit portfolios',
                status: 'Pipeline',
              },
              {
                deal: 'Deal 5',
                sector: 'Digital Lending',
                roundSize: 'Confidential',
                coInvestors: 'In Process',
                desc: 'Tech-driven lending, Rs 300 Cr+ AUM in origination and collection',
                status: 'Pipeline',
              },
            ];
            const statusBadge = (status: string) => (
              <span
                style={{
                  background:
                    status === 'Deployed' ? 'rgba(16,185,129,0.15)' : 'rgba(37,99,235,0.15)',
                  color: status === 'Deployed' ? GREEN : BLUE,
                  borderRadius: 6,
                  padding: '3px 10px',
                  fontSize: 12,
                  fontWeight: 600,
                  whiteSpace: 'nowrap' as const,
                }}
              >
                {status}
              </span>
            );
            // RESPONSIVE: card list on mobile, table on desktop
            if (isMobile) {
              return (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {deals.map((row, i) => (
                    <div
                      key={row.deal}
                      style={{
                        background: SURFACE,
                        borderRadius: 12,
                        padding: 16,
                        animation: 'fadeInUp 0.45s ease-out both',
                        animationDelay: `${i * 60}ms`,
                      }}
                    >
                      <div
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'flex-start',
                          marginBottom: 6,
                        }}
                      >
                        <div style={{ color: TEXT_PRIMARY, fontWeight: 700, fontSize: 15 }}>
                          {row.deal}
                        </div>
                        {statusBadge(row.status)}
                      </div>
                      <div
                        style={{
                          color: TEXT_MUTED,
                          fontSize: 11,
                          textTransform: 'uppercase' as const,
                          letterSpacing: '.04em',
                          marginBottom: 6,
                        }}
                      >
                        {row.sector}
                      </div>
                      <div style={{ color: TEXT_MUTED, fontSize: 13, marginBottom: 4 }}>
                        {row.roundSize} · {row.coInvestors}
                      </div>
                      <div
                        style={{
                          color: TEXT_MUTED,
                          fontSize: 13,
                          lineHeight: 1.5,
                          display: '-webkit-box',
                          WebkitLineClamp: 2,
                          WebkitBoxOrient: 'vertical' as const,
                          overflow: 'hidden',
                        }}
                      >
                        {row.desc}
                      </div>
                    </div>
                  ))}
                </div>
              );
            }
            return (
              <div style={{ background: SURFACE, borderRadius: 16, overflow: 'hidden' }}>
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '1.2fr 1.2fr 1fr 1.2fr 2fr 0.8fr',
                    padding: '12px 20px',
                    background: MUTED,
                    color: TEXT_MUTED,
                    fontSize: 12,
                    fontWeight: 700,
                    textTransform: 'uppercase' as const,
                    letterSpacing: '0.05em',
                  }}
                >
                  <div>Deal</div>
                  <div>Sector</div>
                  <div>Round Size</div>
                  <div>Co-Investors</div>
                  <div>Description</div>
                  <div>Status</div>
                </div>
                {deals.map((row, i) => (
                  <div
                    key={row.deal}
                    style={{
                      display: 'grid',
                      gridTemplateColumns: '1.2fr 1.2fr 1fr 1.2fr 2fr 0.8fr',
                      padding: '14px 20px',
                      borderBottom: i < 4 ? `1px solid ${MUTED}` : 'none',
                      alignItems: 'center',
                      animation: 'fadeInUp 0.45s ease-out both',
                      animationDelay: `${i * 80}ms`,
                    }}
                  >
                    <div style={{ color: TEXT_PRIMARY, fontWeight: 700, fontSize: 14 }}>
                      {row.deal}
                    </div>
                    <div style={{ color: TEXT_MUTED, fontSize: 13 }}>{row.sector}</div>
                    <div style={{ color: TEXT_MUTED, fontSize: 13 }}>{row.roundSize}</div>
                    <div style={{ color: TEXT_MUTED, fontSize: 13 }}>{row.coInvestors}</div>
                    <div style={{ color: TEXT_MUTED, fontSize: 13 }}>{row.desc}</div>
                    <div>{statusBadge(row.status)}</div>
                  </div>
                ))}
              </div>
            );
          })()}
        </section>

        {/* 7. Olee Space Deep Dive */}
        <section style={{ marginBottom: 64 }}>
          <h2
            style={{
              fontSize: 'clamp(1.1rem, 3vw, 1.625rem)',
              fontWeight: 700,
              color: TEXT_PRIMARY,
              marginBottom: 24,
            }}
          >
            Portfolio Deep Dive
          </h2>
          <div
            style={{
              background: SURFACE,
              borderRadius: 20,
              padding: 32,
              marginBottom: 32,
              animation: 'fadeInUp 0.45s ease-out both',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 24 }}>
              <div
                style={{
                  background: `linear-gradient(135deg, ${BLUE}, ${CYAN})`,
                  borderRadius: 12,
                  padding: '10px 20px',
                  fontWeight: 800,
                  fontSize: 22,
                  color: '#fff',
                }}
              >
                Olee Space
              </div>
              <div>
                <div style={{ color: CYAN, fontSize: 13, fontWeight: 600 }}>
                  Deep Tech - Space Communications
                </div>
                <div style={{ color: TEXT_MUTED, fontSize: 12 }}>Q4 FY 2026 - Deployed</div>
              </div>
            </div>

            <div style={{ display: 'flex', gap: 32, flexWrap: 'wrap' }}>
              {/* Left */}
              <div style={{ flex: '1 1 320px', minWidth: 280 }}>
                <div style={{ color: TEXT_MUTED, fontSize: 13, lineHeight: 1.7, marginBottom: 20 }}>
                  Deep-tech space communications company building FSOC and quantum-secure networking
                  systems for ultra-fast, low-latency, secure communication across terrestrial,
                  aerial, maritime, and space environments.
                </div>

                <div style={{ marginBottom: 20 }}>
                  <div
                    style={{ color: TEXT_PRIMARY, fontWeight: 700, fontSize: 14, marginBottom: 10 }}
                  >
                    Founders
                  </div>
                  <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                    <FounderCard
                      name="James Solomon"
                      detail="IIT Bombay - Co-Chair, Broadband India Forum"
                    />
                    <FounderCard
                      name="Suman Hiremath"
                      detail="Member, Broadband India Forum - Founder of Citoto"
                    />
                  </div>
                </div>

                <div style={{ marginBottom: 20 }}>
                  <div
                    style={{ color: TEXT_PRIMARY, fontWeight: 700, fontSize: 14, marginBottom: 10 }}
                  >
                    Value Propositions
                  </div>
                  <ValueProp label="High-speed data transmission" />
                  <ValueProp label="Low-latency connectivity" />
                  <ValueProp label="Quantum-grade security" />
                  <ValueProp label="Operational resilience" />
                </div>

                <div style={{ marginBottom: 20 }}>
                  <div
                    style={{ color: TEXT_PRIMARY, fontWeight: 700, fontSize: 14, marginBottom: 8 }}
                  >
                    Co-Investors
                  </div>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    {['BIG Capital', 'Rockstud Capital'].map((name) => (
                      <span
                        key={name}
                        style={{
                          background: MUTED,
                          color: TEXT_PRIMARY,
                          borderRadius: 8,
                          padding: '4px 12px',
                          fontSize: 13,
                        }}
                      >
                        {name}
                      </span>
                    ))}
                  </div>
                </div>

                <div
                  style={{
                    background: 'rgba(6,182,212,0.08)',
                    border: `1px solid ${CYAN}`,
                    borderRadius: 10,
                    padding: 14,
                  }}
                >
                  <div style={{ color: CYAN, fontSize: 12, fontWeight: 700, marginBottom: 6 }}>
                    Strategic Importance
                  </div>
                  <div style={{ color: TEXT_MUTED, fontSize: 13, lineHeight: 1.6 }}>
                    &ldquo;Category-defining potential in next-generation secure communications
                    infrastructure, positioned at intersection of defence-tech, secure
                    communications, adaptive optics, and dual-use deep-tech systems.&rdquo;
                  </div>
                </div>
              </div>

              {/* Right - Business Updates */}
              <div style={{ flex: '1 1 320px', minWidth: 280 }}>
                <div
                  style={{ color: TEXT_PRIMARY, fontWeight: 700, fontSize: 16, marginBottom: 20 }}
                >
                  Business Updates in Last Quarter
                </div>
                <BizUpdate
                  title="1 Gbps FSO Demo + First Sale"
                  badge="500m range validated"
                  desc="Achieved commercial traction with successful demo and first sale of FSO communication systems delivering 1 Gbps over 500m. First revenue-generating deployment."
                />
                <BizUpdate
                  title="10 km / 10 Gbps Lab Validation"
                  badge="Lab-tested performance"
                  desc="10 km / 10 Gbps systems validated in the lab, demonstrating readiness for field deployment with commercial-grade performance."
                />
                <BizUpdate
                  title="2kW Directed Energy Laser"
                  badge="10% of market cost"
                  desc="Demonstrated a 2kW directed energy laser system for tactical defence applications at roughly 10% of prevailing market cost."
                />
                <BizUpdate
                  title="Defence Interest Generated"
                  badge="Active engagement"
                  desc="Generated active defence interest through deployable laser and communications capabilities, with multiple defence agencies evaluating solutions."
                />
                <BizUpdate
                  title="IP Moat and Security"
                  badge="Strong IP protection"
                  desc="Built a strong IP moat around deployable defence and optical communication systems with 3+ patents filed."
                />
                <BizUpdate
                  title="UGV/Drone Applications"
                  badge="Multi-platform deployment"
                  desc="Developed applications across UGVs, drones, and GPS-denied tactical environments for versatile deployment scenarios."
                />
                <BizUpdate
                  title="Global Supply Chain Partnerships"
                  badge="Europe partnerships established"
                  desc="Begun establishing global supply-chain and component partnerships across Europe for next-generation optical systems."
                />
              </div>
            </div>
          </div>

          {/* 8. Wippi Card */}
          <div
            style={{
              background: SURFACE,
              borderRadius: 20,
              padding: 32,
              animation: 'fadeInUp 0.45s ease-out both',
              animationDelay: '100ms',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 24 }}>
              <div
                style={{
                  background: `linear-gradient(135deg, ${PURPLE}, ${AMBER})`,
                  borderRadius: 12,
                  padding: '10px 20px',
                  fontWeight: 800,
                  fontSize: 22,
                  color: '#fff',
                }}
              >
                Wippi
              </div>
              <div>
                <div style={{ color: PURPLE, fontSize: 13, fontWeight: 600 }}>
                  EdTech - Kids AI Companion
                </div>
                <div style={{ color: TEXT_MUTED, fontSize: 12 }}>
                  Q4 FY 2026 - Deployed (formerly Zippy)
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', gap: 32, flexWrap: 'wrap' }}>
              {/* Left */}
              <div style={{ flex: '1 1 320px', minWidth: 280 }}>
                <div style={{ marginBottom: 20 }}>
                  <div
                    style={{ color: TEXT_PRIMARY, fontWeight: 700, fontSize: 14, marginBottom: 10 }}
                  >
                    Founders
                  </div>
                  <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                    <FounderCard
                      name="Siddhartha Jain"
                      detail="IIT Bombay 2011, 2x Founder, ex-ZestMoney, Paytm - Product/SC"
                    />
                    <FounderCard
                      name="Rishabh Singh"
                      detail="DCE 2009, 3x Founder, ex-RedDoorz - Dist/Content/Ops Leader"
                    />
                  </div>
                </div>

                <div
                  style={{
                    color: TEXT_MUTED,
                    fontSize: 13,
                    lineHeight: 1.7,
                    marginBottom: 20,
                    background: MUTED,
                    borderRadius: 10,
                    padding: 14,
                  }}
                >
                  India&apos;s first phygital AI companion for kids (3-8 years) combining
                  screen-free smart hardware, storybooks, figurines, and conversational AI to reduce
                  screen time while improving learning and engagement.
                </div>

                <div style={{ marginBottom: 20 }}>
                  <div
                    style={{ color: TEXT_PRIMARY, fontWeight: 700, fontSize: 14, marginBottom: 8 }}
                  >
                    Co-Investors
                  </div>
                  <span
                    style={{
                      background: MUTED,
                      color: TEXT_PRIMARY,
                      borderRadius: 8,
                      padding: '4px 12px',
                      fontSize: 13,
                    }}
                  >
                    12Flags VC
                  </span>
                </div>

                <div
                  style={{
                    background: 'rgba(168,85,247,0.08)',
                    border: `1px solid ${PURPLE}`,
                    borderRadius: 10,
                    padding: 14,
                  }}
                >
                  <div style={{ color: PURPLE, fontSize: 12, fontWeight: 700, marginBottom: 6 }}>
                    Quarterly Summary
                  </div>
                  <div style={{ color: TEXT_MUTED, fontSize: 13, lineHeight: 1.6 }}>
                    &ldquo;Successful prototype validation (20 deployments), supply chain readiness
                    (Batch 1: 280 units, Batch 2: ~1,200 units), product ecosystem expansion (8
                    playsets/books), and early brand traction (700+ organic followers).&rdquo;
                  </div>
                </div>
              </div>

              {/* Right - Business Updates */}
              <div style={{ flex: '1 1 320px', minWidth: 280 }}>
                <div
                  style={{ color: TEXT_PRIMARY, fontWeight: 700, fontSize: 16, marginBottom: 20 }}
                >
                  Business Updates in Last Quarter
                </div>
                <BizUpdate
                  title="Prototype Validation"
                  badge="20 Deployments"
                  desc="Completed 20 real-world prototype deployments; validated strong kid engagement, parent safety controls, and conversational AI performance. Hardware audio issue identified and fix deployed."
                />
                <BizUpdate
                  title="Supply Chain Scale-Up"
                  badge="1,480 Units"
                  desc="Batch 1 (280 units) ready for deployment, Batch 2 (~1,200 units) planned. Component standardization and India localization in progress."
                />
                <BizUpdate
                  title="Product Ecosystem"
                  badge="8 Playsets Ready"
                  desc="8 playsets/books completed, figurine manufacturing pipeline active, soft launch assets/live website/social channels ready for market launch."
                />
                <BizUpdate
                  title="Brand Traction"
                  badge="700+ Followers"
                  desc="700+ organic followers in first week; soft launch through DTC planned before broader marketplace rollout."
                />
              </div>
            </div>
          </div>
        </section>

        {/* 9. Investor Network */}
        <section style={{ marginBottom: 64 }}>
          <h2
            style={{
              fontSize: 'clamp(1.1rem, 3vw, 1.625rem)',
              fontWeight: 700,
              color: TEXT_PRIMARY,
              marginBottom: 24,
            }}
          >
            Investor Network
          </h2>

          {/* Founders and Operators */}
          <div
            style={{
              background: SURFACE,
              borderRadius: 16,
              padding: 24,
              marginBottom: 20,
              animation: 'fadeInUp 0.45s ease-out both',
            }}
          >
            <div style={{ color: CYAN, fontWeight: 700, fontSize: 15, marginBottom: 16 }}>
              Investor Mix: Founders and Operators
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
              <Pill name="Amith Agarwal" company="Star Agri" />
              <Pill name="Anirudh Kala" company="Celebal Tech" />
              <Pill name="Nitish Mittersain" company="Nazara Tech" />
              <Pill name="Nitin Jain" company="OfBusiness" />
              <Pill name="Abhinav Jain" company="PharmEasy / CoinDCX" />
              <Pill name="Vikas Jain" company="Insolation Energy" />
              <Pill name="Jaideep Poonia" company="Khatabook" />
              <Pill name="Chandan Garg" company="Innovana Thinklabs" />
              <Pill name="Prashant Kothari" company="KKG Gems" />
              <Pill name="Naresh Biyani" company="CapWise Financials" />
            </div>
          </div>

          {/* EO and Marquee */}
          <div
            style={{
              background: SURFACE,
              borderRadius: 16,
              padding: 24,
              animation: 'fadeInUp 0.45s ease-out both',
              animationDelay: '100ms',
            }}
          >
            <div style={{ color: AMBER, fontWeight: 700, fontSize: 15, marginBottom: 16 }}>
              EO and Marquee Communities
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
              {[
                'Vivek Lodha',
                'Nikhil Madan',
                'Sunil Lunawat',
                'Pranjal Agarwal',
                'Ashutosh Goyal',
                'Abhinav Bhatia',
                'Antariksh Modi',
                'Viresh Mirda',
                'Ashish Kanodia',
              ].map((name) => (
                <Pill key={name} name={name} />
              ))}
              <div
                style={{
                  background: MUTED,
                  borderRadius: 20,
                  padding: '7px 14px',
                  display: 'inline-flex',
                  alignItems: 'center',
                  margin: '4px',
                  color: TEXT_MUTED,
                  fontSize: 13,
                  fontStyle: 'italic',
                }}
              >
                + soonicorn and unicorn founders
              </div>
            </div>
          </div>
        </section>

        {/* 10. Team Section */}
        <section style={{ marginBottom: 64 }}>
          <h2
            style={{
              fontSize: 'clamp(1.1rem, 3vw, 1.625rem)',
              fontWeight: 700,
              color: TEXT_PRIMARY,
              marginBottom: 24,
            }}
          >
            The Team
          </h2>

          {/* Founders */}
          <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap', marginBottom: 24 }}>
            <TeamFounderCard
              initials="SB"
              name="Sharad Bansal"
              title="Co-Founder and Managing Partner"
              details={[
                'Alumnus of IIT Delhi with a minor in Business Management',
                'Founded Tinkerly at 20, scaling to 1 Million students across 2000+ schools',
                'Lead investor in 20+ startups; Active angel investor and IC member for 4 seed funds',
              ]}
              delay={0}
            />
            <TeamFounderCard
              initials="YC"
              name="Yogesh Chaudhary"
              title="Founding Partner"
              details={[
                'Director and Owner, Jaipur Rugs; expanded to 8 Indian cities and global flagship stores',
                'Fortune India 40 Under 40 (2024); Top 100 Angel Investors; 75+ startup portfolio',
              ]}
              delay={100}
            />
            <TeamFounderCard
              initials="RL"
              name="Rajendra Lora"
              title="Founding Partner"
              details={[
                'Co-Founder and CEO Freshokartz; Rs 150 Cr ARR, preparing for IPO',
                'YourStory Tech30 and FICCI Best Supply Chain Startup; community of 500+ entrepreneurs',
              ]}
              delay={200}
            />
          </div>

          {/* Team Members */}
          <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
            <TeamMemberCard name="Nikhil Mishra" role="VP Investments" delay={300} />
            <TeamMemberCard name="Sinchana P" role="Investments" delay={380} />
            <TeamMemberCard
              name="Raghav Katta"
              role="Investments and Portfolio Management"
              delay={460}
            />
          </div>
        </section>

        {/* 11. Footer */}
        <footer
          style={{
            borderTop: `1px solid ${MUTED}`,
            paddingTop: 40,
            display: 'flex',
            flexWrap: 'wrap',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: 24,
          }}
        >
          <div>
            <div style={{ fontWeight: 800, fontSize: 20, color: TEXT_PRIMARY, marginBottom: 4 }}>
              Warmup Ventures
            </div>
            <div style={{ color: TEXT_MUTED, fontSize: 13 }}>Fund II - Q4 FY2026</div>
          </div>
          <div style={{ display: 'flex', gap: 32, flexWrap: 'wrap' }}>
            <div>
              <div style={{ color: TEXT_MUTED, fontSize: 11, marginBottom: 4 }}>Pitch Deck</div>
              <a
                href="mailto:pitch@warmupventures.com"
                style={{ color: CYAN, fontSize: 14, textDecoration: 'none' }}
              >
                pitch@warmupventures.com
              </a>
            </div>
            <div>
              <div style={{ color: TEXT_MUTED, fontSize: 11, marginBottom: 4 }}>Partnerships</div>
              <a
                href="mailto:partner@warmupventures.com"
                style={{ color: CYAN, fontSize: 14, textDecoration: 'none' }}
              >
                partner@warmupventures.com
              </a>
            </div>
            <div>
              <div style={{ color: TEXT_MUTED, fontSize: 11, marginBottom: 4 }}>Website</div>
              <a
                href="https://www.warmupventures.com"
                target="_blank"
                rel="noopener noreferrer"
                style={{ color: CYAN, fontSize: 14, textDecoration: 'none' }}
              >
                www.warmupventures.com
              </a>
            </div>
          </div>
          <div
            style={{
              background: 'rgba(249,115,22,0.1)',
              border: `1px solid ${ORANGE}`,
              borderRadius: 8,
              padding: '8px 16px',
              color: ORANGE,
              fontSize: 12,
              fontWeight: 600,
            }}
          >
            Confidential - For LP Use Only
          </div>
        </footer>
      </div>
    </div>
  );
}
