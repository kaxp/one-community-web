import {
  AlertTriangle,
  Banknote,
  Building2,
  ExternalLink,
  FileText,
  Globe,
  Lock,
} from 'lucide-react';
import { useRole } from '@/auth/use-auth';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { fmtCr } from '@/features/search/lib/labels';
import type { LatestIntelStructured, SearchDetailStartup } from '@/features/search/schemas';
import type { UserRole } from '@/types/enums';
import { InfoRow } from './InfoRow';

const PITCH_DECK_ROLES: ReadonlySet<UserRole> = new Set(['lp', 'admin', 'super_admin']);
const FINANCIAL_ROLES: ReadonlySet<UserRole> = new Set(['lp', 'admin', 'super_admin']);
const ADMIN_ROLES: ReadonlySet<UserRole> = new Set(['admin', 'super_admin']);

interface Props {
  detail: SearchDetailStartup;
}

// ── Shared primitives ─────────────────────────────────────────────────────────

function LinkedInIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
    </svg>
  );
}

/** Compact pill-style link, used for "Links & resources" so the section reads as one row instead of a stacked list. */
function LinkChip({
  icon,
  label,
  href,
}: {
  icon: React.ReactNode;
  label: string;
  href: string | null | undefined;
}) {
  if (!href) return null;
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      onClick={(e) => e.stopPropagation()}
      className="inline-flex items-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-sm text-ink-body transition-colors hover:border-brand hover:text-brand"
    >
      {icon}
      <span>{label}</span>
      <ExternalLink className="h-3 w-3 shrink-0 opacity-50" aria-hidden />
    </a>
  );
}

/** Label/value tile used for the financial stat grid — denser and easier to scan than stacked rows. */
function StatTile({ label, value }: { label: string; value: string | number | null | undefined }) {
  if (value === null || value === undefined || value === '') return null;
  return (
    <div className="flex flex-col gap-1 rounded-lg bg-muted/40 p-3">
      <span className="text-xs font-semibold uppercase tracking-wide text-ink-muted">{label}</span>
      <span className="text-base font-semibold text-ink-heading">{value}</span>
    </div>
  );
}

// ── Intel sub-section helpers ─────────────────────────────────────────────────

function IntelRow({ label, value }: { label: string; value: string | null | undefined }) {
  if (!value) return null;
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-xs font-semibold uppercase tracking-wide text-ink-muted">{label}</span>
      <span className="text-sm text-ink-body">{value}</span>
    </div>
  );
}

function hasContent(obj: Record<string, unknown> | null | undefined): boolean {
  if (!obj) return false;
  return Object.values(obj).some((v) => {
    if (v === null || v === undefined || v === '') return false;
    if (Array.isArray(v)) return v.length > 0;
    return true;
  });
}

type IntelFunding = NonNullable<LatestIntelStructured['funding']>;
type IntelTeam = NonNullable<LatestIntelStructured['team']>;
type IntelTraction = NonNullable<LatestIntelStructured['traction']>;
type IntelCompetition = NonNullable<LatestIntelStructured['competition']>;
type IntelSignal = NonNullable<LatestIntelStructured['investment_signal']>;

function IntelFundingSection({ funding }: { funding: IntelFunding }) {
  if (!hasContent(funding as Record<string, unknown>)) return null;
  return (
    <div className="flex flex-col gap-3">
      <h4 className="text-xs font-semibold uppercase tracking-wide text-ink-muted">Funding</h4>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <IntelRow label="Latest round" value={funding.latest_round} />
        <IntelRow label="Total funding" value={funding.total_funding} />
        <IntelRow label="Valuation" value={funding.valuation} />
        <IntelRow label="Lead investors" value={funding.lead_investors} />
      </div>
    </div>
  );
}

function IntelTeamSection({ team }: { team: IntelTeam }) {
  if (!hasContent(team as Record<string, unknown>)) return null;
  return (
    <div className="flex flex-col gap-3">
      <h4 className="text-xs font-semibold uppercase tracking-wide text-ink-muted">Team</h4>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <IntelRow label="Team size" value={team.team_size} />
        <IntelRow label="Founders" value={team.founders} />
        <IntelRow label="Key hires" value={team.key_hires} />
        <IntelRow label="Notable exits / changes" value={team.exits_changes} />
      </div>
    </div>
  );
}

function IntelTractionSection({ traction }: { traction: IntelTraction }) {
  const hasSomething =
    traction.mrr_arr ||
    traction.customers ||
    traction.geography ||
    (traction.key_customers?.length ?? 0) > 0;
  if (!hasSomething) return null;
  return (
    <div className="flex flex-col gap-3">
      <h4 className="text-xs font-semibold uppercase tracking-wide text-ink-muted">Traction</h4>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <IntelRow label="MRR / ARR" value={traction.mrr_arr} />
        <IntelRow label="Customers" value={traction.customers} />
        <IntelRow label="Geography" value={traction.geography} />
      </div>
      {traction.key_customers && traction.key_customers.length > 0 ? (
        <div className="flex flex-col gap-1.5">
          <span className="text-xs font-semibold uppercase tracking-wide text-ink-muted">
            Key customers
          </span>
          <div className="flex flex-wrap gap-1.5">
            {traction.key_customers.map((c, i) => (
              <Badge key={i} variant="secondary">
                {c}
              </Badge>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}

function IntelCompetitionSection({ competition }: { competition: IntelCompetition }) {
  const hasCompetitors = (competition.competitors?.length ?? 0) > 0;
  if (!competition.differentiation && !hasCompetitors) return null;
  return (
    <div className="flex flex-col gap-3">
      <h4 className="text-xs font-semibold uppercase tracking-wide text-ink-muted">Competition</h4>
      {competition.differentiation ? (
        <div className="flex flex-col gap-1">
          <span className="text-xs font-semibold uppercase tracking-wide text-ink-muted">
            Differentiation
          </span>
          <p className="text-sm text-ink-body">{competition.differentiation}</p>
        </div>
      ) : null}
      {hasCompetitors ? (
        <div className="flex flex-col gap-2">
          <span className="text-xs font-semibold uppercase tracking-wide text-ink-muted">
            Competitors
          </span>
          <div className="flex flex-col gap-3">
            {competition.competitors!.map((c, i) => (
              <div key={i} className="flex flex-col gap-0.5 border-l-2 border-border pl-3">
                <span className="text-sm font-medium text-ink-heading">{c.name}</span>
                {c.description ? <p className="text-xs text-ink-muted">{c.description}</p> : null}
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}

function IntelNewsSection({ news }: { news: NonNullable<LatestIntelStructured['recent_news']> }) {
  const filtered = news.filter((n) => n.headline);
  if (!filtered.length) return null;
  return (
    <div className="flex flex-col gap-3">
      <h4 className="text-xs font-semibold uppercase tracking-wide text-ink-muted">Recent news</h4>
      <div className="flex flex-col gap-2">
        {filtered.map((n, i) =>
          n.url ? (
            <a
              key={i}
              href={n.url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-start gap-1 text-sm text-brand hover:underline"
              onClick={(e) => e.stopPropagation()}
            >
              <span>{n.headline}</span>
              <ExternalLink className="h-3 w-3 shrink-0 mt-0.5" aria-hidden />
            </a>
          ) : (
            <p key={i} className="text-sm text-ink-body">
              {n.headline}
            </p>
          ),
        )}
      </div>
    </div>
  );
}

function IntelRedFlagsSection({ flags }: { flags: string[] }) {
  if (!flags.length) return null;
  return (
    <div className="flex flex-col gap-3 rounded-lg border border-amber-200 bg-amber-50/60 p-3">
      <h4 className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-amber-700">
        <AlertTriangle className="h-3.5 w-3.5" />
        Caution
      </h4>
      <ul className="flex flex-col gap-1.5">
        {flags.map((f, i) => (
          <li key={i} className="flex gap-2 text-sm text-ink-body">
            <span className="mt-0.5 shrink-0 text-amber-500">•</span>
            <span>{f}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function IntelProductUpdatesSection({ updates }: { updates: string[] }) {
  if (!updates.length) return null;
  return (
    <div className="flex flex-col gap-3">
      <h4 className="text-xs font-semibold uppercase tracking-wide text-ink-muted">
        Product updates
      </h4>
      <ul className="flex flex-col gap-1.5">
        {updates.map((u, i) => (
          <li key={i} className="flex gap-2 text-sm text-ink-body">
            <span className="mt-0.5 shrink-0 text-ink-muted">•</span>
            <span>{u}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

const SIGNAL_CONTAINER: Record<string, string> = {
  green: 'bg-green-50 border-green-200',
  yellow: 'bg-amber-50 border-amber-200',
  red: 'bg-red-50 border-red-200',
};
const SIGNAL_BADGE: Record<string, string> = {
  strong: 'bg-green-100 text-green-800',
  moderate: 'bg-amber-100 text-amber-800',
  weak: 'bg-red-100 text-red-800',
};

/** Top-of-page verdict banner (admin only) — surfaced above everything else instead of buried in its own card. */
function InvestmentSignalBanner({ signal }: { signal: IntelSignal }) {
  if (!signal.signal && !signal.line_1) return null;
  const containerCls = SIGNAL_CONTAINER[signal.color ?? ''] ?? 'bg-muted/40 border-border';
  const badgeCls = SIGNAL_BADGE[signal.signal ?? ''] ?? 'bg-muted text-ink-muted';
  return (
    <div className={`flex flex-col gap-2 rounded-xl border p-4 ${containerCls}`}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="text-xs font-semibold uppercase tracking-wide text-ink-muted">
          Investment signal
        </span>
        {signal.signal ? (
          <span
            className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-semibold uppercase ${badgeCls}`}
          >
            {signal.signal}
            {signal.confidence ? ` · ${signal.confidence} confidence` : ''}
          </span>
        ) : null}
      </div>
      {signal.line_1 ? <p className="text-sm text-ink-body">{signal.line_1}</p> : null}
      {signal.line_2 ? <p className="text-sm text-ink-muted">{signal.line_2}</p> : null}
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export function StartupRichDetailBlock({ detail }: Props) {
  const role = useRole();
  const canSeePitchDeck = role != null && PITCH_DECK_ROLES.has(role);
  const canSeeFinancials = role != null && FINANCIAL_ROLES.has(role);
  const isAdmin = role != null && ADMIN_ROLES.has(role);

  const pitchDeckUrl = canSeePitchDeck ? detail.pitch_deck_url : null;
  const intel = detail.latest_intel_structured ?? null;

  const hasAbout =
    detail.founding_year != null ||
    detail.team_size != null ||
    detail.city ||
    detail.revenue_model ||
    detail.traction;

  const hasFounders = detail.founders && detail.founders.length > 0;
  const hasLinks = detail.website_url || detail.company_linkedin_url || detail.tracxn_url;
  const hasResources = hasLinks || pitchDeckUrl;
  const hasOverview = hasAbout || hasFounders || hasResources;

  const hasFinancials =
    canSeeFinancials &&
    (detail.funding_target_cr != null ||
      detail.raising_raw ||
      detail.mrr_arr ||
      detail.revenue_monthly != null ||
      detail.burn_monthly != null ||
      detail.runway_months != null ||
      detail.existing_investors ||
      detail.money_raised ||
      detail.last_round_valuation ||
      detail.valuation_sought);

  const hasSecondaryFinancials =
    detail.existing_investors ||
    detail.last_round_valuation ||
    detail.money_raised ||
    detail.valuation_sought ||
    detail.debt_amount?.length ||
    detail.debt_raise;

  const hasAdminFields =
    detail.ai_pitch_summary ||
    detail.deal_manager ||
    detail.partner_on_call?.length ||
    detail.notion_status ||
    detail.investment_memo_url;

  const hasIntel =
    intel != null &&
    (hasContent(intel.quick_stats as Record<string, unknown>) ||
      hasContent(intel.funding as Record<string, unknown>) ||
      hasContent(intel.team as Record<string, unknown>) ||
      !!(
        intel.traction?.mrr_arr ||
        intel.traction?.customers ||
        intel.traction?.geography ||
        intel.traction?.key_customers?.length
      ) ||
      !!(intel.competition?.differentiation || intel.competition?.competitors?.length) ||
      !!intel.recent_news?.some((n) => n.headline) ||
      !!intel.red_flags?.length ||
      !!intel.product_updates?.length ||
      !!intel.summary);

  return (
    <>
      {/* Investment signal — surfaced first so admins see the verdict before the details */}
      {isAdmin && intel?.investment_signal ? (
        <InvestmentSignalBanner signal={intel.investment_signal} />
      ) : null}

      {/* Overview — about, founders, and resources in one place instead of three separate cards */}
      {hasOverview ? (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-4 w-4 text-ink-muted" aria-hidden />
              Overview
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-6">
            {hasAbout ? (
              <div className="flex flex-col gap-4">
                <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                  <InfoRow
                    label="Founded"
                    value={detail.founding_year != null ? String(detail.founding_year) : null}
                    isMasked={false}
                  />
                  <InfoRow label="City" value={detail.city} isMasked={false} />
                  <InfoRow
                    label="Team size"
                    value={detail.team_size != null ? String(detail.team_size) : null}
                    isMasked={false}
                  />
                  <InfoRow label="Revenue model" value={detail.revenue_model} isMasked={false} />
                </div>
                {detail.traction ? (
                  <div className="flex flex-col gap-1">
                    <span className="text-xs font-semibold uppercase tracking-wide text-ink-muted">
                      Traction
                    </span>
                    <p className="text-sm text-ink-body">{detail.traction}</p>
                  </div>
                ) : null}
              </div>
            ) : null}

            {hasFounders ? (
              <div
                className={`flex flex-col gap-3 ${hasAbout ? 'border-t border-border pt-5' : ''}`}
              >
                <span className="text-xs font-semibold uppercase tracking-wide text-ink-muted">
                  Founders
                </span>
                <div className="flex flex-col divide-y divide-border">
                  {detail.founders!.map((f, i) => (
                    <div key={i} className="flex flex-col gap-1.5 py-3 first:pt-0 last:pb-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-semibold text-ink-heading">
                          {f.name ?? 'Unknown founder'}
                          {f.position ? (
                            <span className="ml-2 text-xs font-normal text-ink-muted">
                              ({f.position})
                            </span>
                          ) : null}
                        </p>
                        {f.linkedin_url ? (
                          <a
                            href={f.linkedin_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-[#0A66C2] transition-opacity hover:opacity-75"
                            aria-label={`${f.name ?? 'Founder'} on LinkedIn`}
                            onClick={(e) => e.stopPropagation()}
                          >
                            <LinkedInIcon className="h-4 w-4" />
                          </a>
                        ) : null}
                      </div>
                      {f.description ? (
                        <p className="text-sm text-ink-body">{f.description}</p>
                      ) : null}
                      {f.email || f.phone ? (
                        <div className="flex flex-wrap items-center gap-2">
                          {f.email ? (
                            <a
                              href={`mailto:${f.email}`}
                              className="text-xs text-brand hover:underline"
                              onClick={(e) => e.stopPropagation()}
                            >
                              {f.email}
                            </a>
                          ) : null}
                          {f.email && f.phone ? (
                            <span className="text-xs text-ink-muted">·</span>
                          ) : null}
                          {f.phone ? (
                            <span className="text-xs text-ink-muted">{f.phone}</span>
                          ) : null}
                        </div>
                      ) : null}
                    </div>
                  ))}
                </div>
              </div>
            ) : null}

            {hasResources ? (
              <div
                className={`flex flex-col gap-2 ${
                  hasAbout || hasFounders ? 'border-t border-border pt-5' : ''
                }`}
              >
                <span className="text-xs font-semibold uppercase tracking-wide text-ink-muted">
                  Links &amp; resources
                </span>
                <div className="flex flex-wrap gap-2">
                  <LinkChip
                    icon={<FileText className="h-3.5 w-3.5" aria-hidden />}
                    label="Pitch deck"
                    href={pitchDeckUrl}
                  />
                  <LinkChip
                    icon={<Globe className="h-3.5 w-3.5" aria-hidden />}
                    label="Website"
                    href={detail.website_url}
                  />
                  <LinkChip
                    icon={<LinkedInIcon className="h-3.5 w-3.5 text-[#0A66C2]" />}
                    label="LinkedIn"
                    href={detail.company_linkedin_url}
                  />
                  <LinkChip
                    icon={<ExternalLink className="h-3.5 w-3.5" aria-hidden />}
                    label="Tracxn"
                    href={detail.tracxn_url}
                  />
                </div>
              </div>
            ) : null}
          </CardContent>
        </Card>
      ) : null}

      {/* Financials — key numbers as scannable tiles, supporting details below */}
      {hasFinancials ? (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Banknote className="h-4 w-4 text-ink-muted" aria-hidden />
              Financials
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-6">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <StatTile
                label="Raising"
                value={
                  detail.raising_raw ??
                  (detail.funding_target_cr != null ? fmtCr(detail.funding_target_cr) : null)
                }
              />
              <StatTile label="MRR / ARR" value={detail.mrr_arr} />
              <StatTile
                label="Monthly revenue"
                value={detail.revenue_monthly != null ? fmtCr(detail.revenue_monthly / 100) : null}
              />
              <StatTile
                label="Monthly burn"
                value={detail.burn_monthly != null ? fmtCr(detail.burn_monthly / 100) : null}
              />
              <StatTile
                label="Runway"
                value={detail.runway_months != null ? `${detail.runway_months} months` : null}
              />
              <StatTile
                label="Growth"
                value={detail.growth_pct != null ? `${detail.growth_pct}%` : null}
              />
              <StatTile
                label="Gross margin"
                value={detail.gross_margin_pct != null ? `${detail.gross_margin_pct}%` : null}
              />
              <StatTile label="Customers" value={detail.customer_count} />
            </div>

            {hasSecondaryFinancials ? (
              <div className="grid grid-cols-1 gap-4 border-t border-border pt-5 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <InfoRow
                    label="Existing investors"
                    value={detail.existing_investors}
                    isMasked={false}
                  />
                </div>
                <InfoRow
                  label="Last round valuation"
                  value={detail.last_round_valuation}
                  isMasked={false}
                />
                <InfoRow label="Total raised" value={detail.money_raised} isMasked={false} />
                <InfoRow
                  label="Valuation sought"
                  value={detail.valuation_sought}
                  isMasked={false}
                />
                {detail.debt_amount?.length ? (
                  <div className="flex flex-col gap-1">
                    <span className="text-xs font-semibold uppercase tracking-wide text-ink-muted">
                      Debt
                    </span>
                    <div className="flex flex-wrap gap-1">
                      {detail.debt_amount.map((d) => (
                        <Badge key={d} variant="outline">
                          {d}
                        </Badge>
                      ))}
                    </div>
                  </div>
                ) : null}
                <InfoRow label="Debt raise" value={detail.debt_raise} isMasked={false} />
              </div>
            ) : null}
          </CardContent>
        </Card>
      ) : null}

      {/* Latest Public Intel — sourced from the web */}
      {hasIntel ? (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex flex-col gap-0.5">
              <CardTitle className="flex items-center gap-2 text-base">
                <Globe className="h-4 w-4 text-ink-muted" aria-hidden />
                Latest Public Intel
              </CardTitle>
              <p className="text-xs text-ink-muted">
                Sourced from public internet
                {intel?.last_updated ? ` · Updated ${intel.last_updated}` : ''}
              </p>
            </div>
          </CardHeader>
          <CardContent className="flex flex-col gap-6">
            {/* Quick stats grid */}
            {intel?.quick_stats && hasContent(intel.quick_stats as Record<string, unknown>) ? (
              <div className="grid grid-cols-2 gap-3 rounded-lg bg-muted/40 p-3 sm:grid-cols-4">
                <IntelRow label="HQ" value={intel.quick_stats.hq} />
                <IntelRow label="Stage" value={intel.quick_stats.stage} />
                <IntelRow label="Sector" value={intel.quick_stats.sector} />
                <IntelRow label="Founded" value={intel.quick_stats.founded} />
              </div>
            ) : null}

            {intel?.summary ? (
              <div className="flex flex-col gap-1">
                <span className="text-xs font-semibold uppercase tracking-wide text-ink-muted">
                  Summary
                </span>
                <p className="text-sm text-ink-body">{intel.summary}</p>
              </div>
            ) : null}

            {intel?.funding ? <IntelFundingSection funding={intel.funding} /> : null}
            {intel?.team ? <IntelTeamSection team={intel.team} /> : null}
            {intel?.traction ? <IntelTractionSection traction={intel.traction} /> : null}
            {intel?.competition ? (
              <IntelCompetitionSection competition={intel.competition} />
            ) : null}
            {intel?.recent_news ? <IntelNewsSection news={intel.recent_news} /> : null}
            {intel?.product_updates?.length ? (
              <IntelProductUpdatesSection updates={intel.product_updates} />
            ) : null}
            {intel?.red_flags?.length ? <IntelRedFlagsSection flags={intel.red_flags} /> : null}
          </CardContent>
        </Card>
      ) : null}

      {/* Internal — admin only */}
      {hasAdminFields ? (
        <Card className="border-dashed">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Lock className="h-4 w-4 text-ink-muted" aria-hidden />
              Internal
            </CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {detail.ai_signal ? (
              <div className="flex items-center gap-2 sm:col-span-2">
                <span className="text-xs font-semibold uppercase tracking-wide text-ink-muted">
                  AI signal
                </span>
                <Badge
                  variant={
                    detail.ai_signal === 'strong'
                      ? 'default'
                      : detail.ai_signal === 'moderate'
                        ? 'secondary'
                        : 'outline'
                  }
                >
                  {detail.ai_signal}
                </Badge>
              </div>
            ) : null}
            {detail.ai_pitch_summary ? (
              <div className="flex flex-col gap-1 sm:col-span-2">
                <span className="text-xs font-semibold uppercase tracking-wide text-ink-muted">
                  AI summary
                </span>
                <p className="text-sm text-ink-body">{detail.ai_pitch_summary}</p>
              </div>
            ) : null}
            <InfoRow label="Deal manager" value={detail.deal_manager} isMasked={false} />
            <InfoRow label="Notion status" value={detail.notion_status} isMasked={false} />
            {detail.partner_on_call?.length ? (
              <div className="flex flex-col gap-1">
                <span className="text-xs font-semibold uppercase tracking-wide text-ink-muted">
                  Partner on call
                </span>
                <div className="flex flex-wrap gap-1">
                  {detail.partner_on_call.map((p) => (
                    <Badge key={p} variant="secondary">
                      {p}
                    </Badge>
                  ))}
                </div>
              </div>
            ) : null}
            <ExternalLinkRow label="Investment memo" href={detail.investment_memo_url} />
          </CardContent>
        </Card>
      ) : null}
    </>
  );
}

function ExternalLinkRow({ label, href }: { label: string; href: string | null | undefined }) {
  if (!href) return null;
  return (
    <div className="flex flex-col gap-1">
      <span className="text-xs font-semibold uppercase tracking-wide text-ink-muted">{label}</span>
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-1 text-sm text-brand hover:underline break-all min-w-0"
        onClick={(e) => e.stopPropagation()}
      >
        <span className="break-all min-w-0">{href}</span>
        <ExternalLink className="h-3 w-3 shrink-0" aria-hidden />
      </a>
    </div>
  );
}
