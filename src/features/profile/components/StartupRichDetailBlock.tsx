import { ExternalLink, AlertTriangle } from 'lucide-react';
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
      <h4 className="text-xs font-semibold uppercase tracking-wide text-ink-muted border-b pb-1">
        Funding
      </h4>
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
      <h4 className="text-xs font-semibold uppercase tracking-wide text-ink-muted border-b pb-1">
        Team
      </h4>
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
      <h4 className="text-xs font-semibold uppercase tracking-wide text-ink-muted border-b pb-1">
        Traction
      </h4>
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
      <h4 className="text-xs font-semibold uppercase tracking-wide text-ink-muted border-b pb-1">
        Competition
      </h4>
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
              <div key={i} className="flex flex-col gap-0.5 pl-3 border-l-2 border-border">
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
      <h4 className="text-xs font-semibold uppercase tracking-wide text-ink-muted border-b pb-1">
        Recent news
      </h4>
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
    <div className="flex flex-col gap-3">
      <h4 className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-amber-600 border-b border-amber-200 pb-1">
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
      <h4 className="text-xs font-semibold uppercase tracking-wide text-ink-muted border-b pb-1">
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

function InvestmentSignalCard({ signal }: { signal: IntelSignal }) {
  if (!signal.signal && !signal.line_1) return null;
  const containerCls = SIGNAL_CONTAINER[signal.color ?? ''] ?? 'bg-muted/50 border-border';
  const badgeCls = SIGNAL_BADGE[signal.signal ?? ''] ?? 'bg-muted text-ink-muted';
  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between gap-3">
          <CardTitle className="text-base">Investment Signal</CardTitle>
          {signal.signal ? (
            <span
              className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-semibold uppercase ${badgeCls}`}
            >
              {signal.signal}
              {signal.confidence ? ` · ${signal.confidence} confidence` : ''}
            </span>
          ) : null}
        </div>
      </CardHeader>
      <CardContent>
        <div className={`flex flex-col gap-1.5 rounded-lg border p-3 ${containerCls}`}>
          {signal.line_1 ? <p className="text-sm text-ink-body">{signal.line_1}</p> : null}
          {signal.line_2 ? <p className="text-sm text-ink-muted">{signal.line_2}</p> : null}
        </div>
      </CardContent>
    </Card>
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

  const hasAdminFields =
    detail.ai_pitch_summary ||
    detail.deal_manager ||
    detail.partner_on_call?.length ||
    detail.notion_status ||
    detail.investment_memo_url;

  const hasFounders = detail.founders && detail.founders.length > 0;
  const hasLinks = detail.website_url || detail.company_linkedin_url || detail.tracxn_url;

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
      {/* About */}
      {hasAbout ? (
        <Card>
          <CardHeader>
            <CardTitle>About</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-4">
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
            {detail.traction ? (
              <div className="col-span-2 flex flex-col gap-1">
                <span className="text-xs font-semibold uppercase tracking-wide text-ink-muted">
                  Traction
                </span>
                <p className="text-sm text-ink-body">{detail.traction}</p>
              </div>
            ) : null}
          </CardContent>
        </Card>
      ) : null}

      {/* Founders */}
      {hasFounders ? (
        <Card>
          <CardHeader>
            <CardTitle>Founders</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-5">
            {detail.founders!.map((f, i) => (
              <div key={i} className="flex flex-col gap-1.5">
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
                {f.description ? <p className="text-sm text-ink-body">{f.description}</p> : null}
                {f.email ? (
                  <a
                    href={`mailto:${f.email}`}
                    className="text-xs text-brand hover:underline"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {f.email}
                  </a>
                ) : null}
                {f.phone ? <span className="text-xs text-ink-muted">{f.phone}</span> : null}
              </div>
            ))}
          </CardContent>
        </Card>
      ) : null}

      {/* Pitch deck — lp / admin / super_admin */}
      {pitchDeckUrl ? (
        <Card>
          <CardHeader>
            <CardTitle>Pitch Deck</CardTitle>
          </CardHeader>
          <CardContent>
            <a
              href={pitchDeckUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-sm text-brand hover:underline break-all"
              onClick={(e) => e.stopPropagation()}
            >
              <ExternalLink className="h-4 w-4 shrink-0" aria-hidden />
              {pitchDeckUrl}
            </a>
          </CardContent>
        </Card>
      ) : null}

      {/* External links */}
      {hasLinks ? (
        <Card>
          <CardHeader>
            <CardTitle>Links</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <ExternalLinkRow label="Website" href={detail.website_url} />
            {detail.company_linkedin_url ? (
              <div className="flex flex-col gap-1">
                <span className="text-xs font-semibold uppercase tracking-wide text-ink-muted">
                  LinkedIn
                </span>
                <a
                  href={detail.company_linkedin_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-sm text-[#0A66C2] hover:opacity-75 break-all"
                  onClick={(e) => e.stopPropagation()}
                >
                  <LinkedInIcon className="h-4 w-4 shrink-0" />
                  <span className="break-all">{detail.company_linkedin_url}</span>
                </a>
              </div>
            ) : null}
            <ExternalLinkRow label="Tracxn" href={detail.tracxn_url} />
          </CardContent>
        </Card>
      ) : null}

      {/* Financials */}
      {hasFinancials ? (
        <Card>
          <CardHeader>
            <CardTitle>Financials</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <InfoRow
              label="Raising"
              value={
                detail.raising_raw ??
                (detail.funding_target_cr != null ? fmtCr(detail.funding_target_cr) : null)
              }
              isMasked={false}
            />
            <InfoRow label="MRR / ARR" value={detail.mrr_arr} isMasked={false} />
            <InfoRow
              label="Monthly revenue"
              value={detail.revenue_monthly != null ? fmtCr(detail.revenue_monthly / 100) : null}
              isMasked={false}
            />
            <InfoRow
              label="Monthly burn"
              value={detail.burn_monthly != null ? fmtCr(detail.burn_monthly / 100) : null}
              isMasked={false}
            />
            <InfoRow
              label="Runway"
              value={detail.runway_months != null ? `${detail.runway_months} months` : null}
              isMasked={false}
            />
            <InfoRow
              label="Growth"
              value={detail.growth_pct != null ? `${detail.growth_pct}%` : null}
              isMasked={false}
            />
            <InfoRow
              label="Gross margin"
              value={detail.gross_margin_pct != null ? `${detail.gross_margin_pct}%` : null}
              isMasked={false}
            />
            <InfoRow label="Customers" value={detail.customer_count} isMasked={false} />
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
            <InfoRow label="Valuation sought" value={detail.valuation_sought} isMasked={false} />
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
          </CardContent>
        </Card>
      ) : null}

      {/* Latest Public Intel — sourced from the web */}
      {hasIntel ? (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex flex-col gap-0.5">
              <CardTitle className="text-base">Latest Public Intel</CardTitle>
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

      {/* Investment Signal — admin / super_admin only */}
      {isAdmin && intel?.investment_signal ? (
        <InvestmentSignalCard signal={intel.investment_signal} />
      ) : null}

      {/* Internal — admin only */}
      {hasAdminFields ? (
        <Card>
          <CardHeader>
            <CardTitle>Internal</CardTitle>
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
