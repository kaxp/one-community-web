import {
  AlertTriangle,
  Banknote,
  Building2,
  Database,
  ExternalLink,
  FileText,
  Globe,
  Lock,
  Presentation,
} from 'lucide-react';
import { useRole } from '@/auth/use-auth';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { fmtCr } from '@/features/search/lib/labels';
import type { LatestIntelStructured, SearchDetailStartup } from '@/features/search/schemas';
import type { UserRole } from '@/types/enums';
import { StartupStageBadge } from '@/components/badges/StartupStageBadge';
import { InfoRow } from './InfoRow';

const PITCH_DECK_ROLES: ReadonlySet<UserRole> = new Set([
  'lp',
  'potential_lp',
  'admin',
  'super_admin',
]);
const FINANCIAL_ROLES: ReadonlySet<UserRole> = new Set([
  'lp',
  'potential_lp',
  'admin',
  'super_admin',
]);
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

/**
 * Some upstream data sources use "-" (or an em/en dash) as a placeholder for "no value".
 * Treat those the same as null/empty so we don't render dead links or empty fields.
 */
const PLACEHOLDER_VALUES = new Set(['-', '—', '–']);

function cleanText(value: string | null | undefined): string | null {
  if (value == null) return null;
  const trimmed = value.trim();
  if (trimmed === '' || PLACEHOLDER_VALUES.has(trimmed)) return null;
  return trimmed;
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
  const url = cleanText(href);
  if (!url) return null;
  return (
    <a
      href={url}
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

const URL_REGEX = /https?:\/\/[^\s),]+/g;

function TextWithLinks({ text }: { text: string }) {
  const parts: React.ReactNode[] = [];
  let last = 0;
  let match: RegExpExecArray | null;
  URL_REGEX.lastIndex = 0;
  while ((match = URL_REGEX.exec(text)) !== null) {
    if (match.index > last) parts.push(text.slice(last, match.index));
    const url = match[0];
    parts.push(
      <a
        key={match.index}
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className="text-blue-600 underline break-all hover:text-blue-800"
        onClick={(e) => e.stopPropagation()}
      >
        {url}
      </a>,
    );
    last = match.index + url.length;
  }
  if (last < text.length) parts.push(text.slice(last));
  return <>{parts}</>;
}

function IntelRow({ label, value }: { label: string; value: string | null | undefined }) {
  if (!value) return null;
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-xs font-semibold uppercase tracking-wide text-ink-muted">{label}</span>
      <span className="text-sm text-ink-body break-words">
        <TextWithLinks text={value} />
      </span>
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
        {filtered.map((n, i) => {
          const url = cleanText(n.url);
          return url ? (
            <a
              key={i}
              href={url}
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
          );
        })}
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
            <span className="break-words min-w-0">
              <TextWithLinks text={f} />
            </span>
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
            <span className="break-words min-w-0">
              <TextWithLinks text={u} />
            </span>
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
/** Top-of-page verdict banner — color background kept for all users; signal-rating text intentionally hidden. */
function InvestmentSignalBanner({ signal }: { signal: IntelSignal }) {
  if (!signal.signal && !signal.line_1) return null;
  const containerCls = SIGNAL_CONTAINER[signal.color ?? ''] ?? 'bg-muted/40 border-border';
  return (
    <div className={`flex flex-col gap-2 rounded-xl border p-4 ${containerCls}`}>
      <span className="text-xs font-semibold uppercase tracking-wide text-ink-muted">
        Investment signal
      </span>
      {signal.line_1 ? <p className="text-sm text-ink-body">{signal.line_1}</p> : null}
      {signal.line_2 ? <p className="text-sm text-ink-muted">{signal.line_2}</p> : null}
    </div>
  );
}

// ── Pitch deck extraction helpers ────────────────────────────────────────────

function asRec(v: unknown): Record<string, unknown> {
  return v && typeof v === 'object' && !Array.isArray(v) ? (v as Record<string, unknown>) : {};
}
function asArr(v: unknown): unknown[] {
  return Array.isArray(v) ? v : [];
}

function DeckSection({
  title,
  lp,
  children,
}: {
  title: string;
  lp?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <h4 className="text-xs font-semibold uppercase tracking-wide text-ink-muted">{title}</h4>
        {lp ? (
          <span className="rounded-full bg-brand/10 px-1.5 py-0.5 text-xs font-medium text-brand">
            LP
          </span>
        ) : null}
      </div>
      {children}
    </div>
  );
}

function DeckField({
  label,
  value,
  multiline,
}: {
  label: string;
  value: unknown;
  multiline?: boolean;
}) {
  const v = value == null || value === '' ? null : String(value);
  if (!v) return null;
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-xs text-ink-muted">{label}</span>
      {multiline ? (
        <p className="whitespace-pre-wrap text-sm text-ink-body">{v}</p>
      ) : (
        <span className="text-sm text-ink-body">{v}</span>
      )}
    </div>
  );
}

function DeckBullets({ label, items }: { label: string; items: unknown }) {
  const arr = asArr(items).filter((x) => x != null && x !== '') as string[];
  if (!arr.length) return null;
  return (
    <div className="flex flex-col gap-1">
      <span className="text-xs text-ink-muted">{label}</span>
      <ul className="flex flex-col gap-0.5">
        {arr.map((item, i) => (
          <li key={i} className="flex gap-2 text-sm text-ink-body">
            <span className="shrink-0 text-ink-muted">•</span>
            <span>{String(item)}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export function StartupRichDetailBlock({ detail }: Props) {
  const role = useRole();
  const canSeePitchDeck = role != null && PITCH_DECK_ROLES.has(role);
  const canSeeFinancials = role != null && FINANCIAL_ROLES.has(role);
  const isAdmin = role != null && ADMIN_ROLES.has(role);

  const isInvestor = role === 'lp' || role === 'potential_lp';
  const pitchDeckUrl = cleanText(canSeePitchDeck ? detail.pitch_deck_url : null);
  const intel = detail.latest_intel_structured ?? null;

  const hasAbout =
    detail.founding_year != null ||
    detail.team_size != null ||
    detail.city ||
    detail.stage ||
    detail.revenue_model ||
    detail.traction;

  const hasFounders = detail.founders && detail.founders.length > 0;
  const hasLinks = !!(
    cleanText(detail.website_url) ||
    cleanText(detail.company_linkedin_url) ||
    cleanText(detail.tracxn_url)
  );
  const hasResources = hasLinks || !!pitchDeckUrl;
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
                  {detail.stage ? (
                    <div className="flex flex-col gap-1">
                      <span className="text-xs font-semibold uppercase tracking-wide text-ink-muted">
                        Stage
                      </span>
                      <StartupStageBadge stage={detail.stage} />
                    </div>
                  ) : null}
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
                  {detail.founders!.map((f, i) => {
                    const founderLinkedIn = cleanText(f.linkedin_url);
                    const founderEmail = cleanText(f.email);
                    const founderPhone = cleanText(f.phone);
                    return (
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
                          {founderLinkedIn ? (
                            <a
                              href={founderLinkedIn}
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
                        {founderEmail || founderPhone ? (
                          <div className="flex flex-wrap items-center gap-2">
                            {founderEmail ? (
                              <a
                                href={`mailto:${founderEmail}`}
                                className="text-xs text-brand hover:underline"
                                onClick={(e) => e.stopPropagation()}
                              >
                                {founderEmail}
                              </a>
                            ) : null}
                            {founderEmail && founderPhone ? (
                              <span className="text-xs text-ink-muted">·</span>
                            ) : null}
                            {founderPhone ? (
                              <span className="text-xs text-ink-muted">{founderPhone}</span>
                            ) : null}
                          </div>
                        ) : null}
                      </div>
                    );
                  })}
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
                    icon={<Presentation className="h-3.5 w-3.5" aria-hidden />}
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
                    icon={<Database className="h-3.5 w-3.5" aria-hidden />}
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

      {/* Evaluation Summary — AI-generated evaluation */}
      {hasIntel ? (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex flex-col gap-0.5">
              <CardTitle className="flex items-center gap-2">
                <Globe className="h-4 w-4 text-ink-muted" aria-hidden />
                Evaluation Summary
              </CardTitle>
              <p className="text-xs text-ink-muted">
                AI-generated evaluation
                {intel?.last_updated ? ` · Updated ${intel.last_updated}` : ''}
              </p>
              {intel?.evaluation_generated_at && (
                <p className="text-xs text-ink-muted mt-0.5">
                  Evaluated{' '}
                  {new Date(intel.evaluation_generated_at).toLocaleDateString('en-IN', {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric',
                  })}
                </p>
              )}
            </div>
          </CardHeader>
          <CardContent className="flex flex-col gap-6">
            {/* Quick stats grid */}
            {intel?.quick_stats && hasContent(intel.quick_stats as Record<string, unknown>) ? (
              <div className="grid grid-cols-1 gap-3 rounded-lg bg-muted/40 p-3 sm:grid-cols-2">
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

      {/* Pitch Deck Evaluation */}
      {intel?.pitch_deck_extraction ? (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex flex-col gap-0.5">
              <CardTitle className="flex items-center gap-2">
                <Presentation className="h-4 w-4 text-ink-muted" aria-hidden />
                Pitch Deck Evaluation
              </CardTitle>
              <p className="text-xs text-ink-muted">
                Extracted from founder&apos;s pitch deck
                {intel.pitch_deck_extracted_at
                  ? ` · ${new Date(intel.pitch_deck_extracted_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}`
                  : ''}
              </p>
            </div>
          </CardHeader>
          <CardContent className="flex flex-col gap-6">
            {/* Company Snapshot */}
            {intel.pitch_deck_extraction.public?.company_snapshot ? (
              <DeckSection title="Company Snapshot">
                <DeckField
                  label="Brand name"
                  value={asRec(intel.pitch_deck_extraction.public.company_snapshot).brand_name}
                />
                <DeckField
                  label="Legal name"
                  value={asRec(intel.pitch_deck_extraction.public.company_snapshot).legal_name}
                />
                <DeckField
                  label="Description"
                  value={
                    asRec(intel.pitch_deck_extraction.public.company_snapshot).short_description
                  }
                  multiline
                />
                <DeckField
                  label="Founded"
                  value={asRec(intel.pitch_deck_extraction.public.company_snapshot).founded_year}
                />
                <DeckField
                  label="Location"
                  value={asRec(intel.pitch_deck_extraction.public.company_snapshot).hq_location}
                />
              </DeckSection>
            ) : null}

            {/* What They Do */}
            {intel.pitch_deck_extraction.public?.what_they_do ? (
              <DeckSection title="What They Do">
                <DeckField
                  label="Product"
                  value={asRec(intel.pitch_deck_extraction.public.what_they_do).product_description}
                  multiline
                />
                <DeckBullets
                  label="Core offering"
                  items={asRec(intel.pitch_deck_extraction.public.what_they_do).core_offering}
                />
                <DeckField
                  label="Target customer"
                  value={asRec(intel.pitch_deck_extraction.public.what_they_do).target_customer_icp}
                />
              </DeckSection>
            ) : null}

            {/* Business Model */}
            {intel.pitch_deck_extraction.public?.business_model ? (
              <DeckSection title="Business Model">
                <DeckField
                  label="Pricing"
                  value={asRec(intel.pitch_deck_extraction.public.business_model).pricing_structure}
                />
                {asArr(
                  asRec(intel.pitch_deck_extraction.public.business_model).revenue_streams,
                ).map((s, i) => (
                  <div key={i} className="flex flex-col gap-0.5 border-l-2 border-border pl-3">
                    <span className="text-sm font-medium text-ink-body">
                      {String(asRec(s).name ?? '')}
                    </span>
                    {asRec(s).model_type ? (
                      <span className="text-xs text-ink-muted">{String(asRec(s).model_type)}</span>
                    ) : null}
                  </div>
                ))}
              </DeckSection>
            ) : null}

            {/* Traction Snapshot */}
            {intel.pitch_deck_extraction.public?.traction_snapshot ? (
              <DeckSection title="Traction Snapshot">
                <DeckField
                  label="Revenue bracket"
                  value={
                    asRec(intel.pitch_deck_extraction.public.traction_snapshot).revenue_bracket
                  }
                />
                <DeckField
                  label="Customers"
                  value={asRec(intel.pitch_deck_extraction.public.traction_snapshot).customer_count}
                />
                <DeckField
                  label="As of"
                  value={asRec(intel.pitch_deck_extraction.public.traction_snapshot).as_of_date}
                />
                {asRec(intel.pitch_deck_extraction.public.traction_snapshot).is_cumulative !=
                null ? (
                  <DeckField
                    label="Metric type"
                    value={
                      asRec(intel.pitch_deck_extraction.public.traction_snapshot).is_cumulative
                        ? 'Cumulative (lifetime)'
                        : 'Current run-rate'
                    }
                  />
                ) : null}
              </DeckSection>
            ) : null}

            {/* Team */}
            {intel.pitch_deck_extraction.public?.team ? (
              <DeckSection title="Team">
                {asArr(asRec(intel.pitch_deck_extraction.public.team).founders).map((f, i) => (
                  <div key={i} className="flex flex-col gap-0.5">
                    <span className="text-sm font-medium text-ink-body">
                      {String(asRec(f).name ?? '')}
                      {asRec(f).role ? ` — ${String(asRec(f).role)}` : ''}
                    </span>
                    {asArr(asRec(f).prior_companies).length ? (
                      <span className="text-xs text-ink-muted">
                        {asArr(asRec(f).prior_companies).map(String).join(', ')}
                      </span>
                    ) : null}
                    {asRec(f).linkedin && String(asRec(f).linkedin).startsWith('http') ? (
                      <a
                        href={String(asRec(f).linkedin)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-brand underline"
                        onClick={(e) => e.stopPropagation()}
                      >
                        LinkedIn
                      </a>
                    ) : null}
                  </div>
                ))}
                <DeckField
                  label="Team size"
                  value={asRec(intel.pitch_deck_extraction.public.team).team_size}
                />
                <DeckField
                  label="Functional split"
                  value={asRec(intel.pitch_deck_extraction.public.team).functional_split}
                />
                <DeckBullets
                  label="Open roles"
                  items={asRec(intel.pitch_deck_extraction.public.team).open_roles}
                />
                <DeckBullets
                  label="Advisors"
                  items={asRec(intel.pitch_deck_extraction.public.team).advisors}
                />
              </DeckSection>
            ) : null}

            {/* Competitive Landscape */}
            {intel.pitch_deck_extraction.public?.competitive_landscape ? (
              <DeckSection title="Competitive Landscape">
                {asArr(
                  asRec(intel.pitch_deck_extraction.public.competitive_landscape).founders_framing,
                ).map((c, i) => (
                  <div key={i} className="flex flex-col gap-0.5 border-l-2 border-border pl-3">
                    <span className="text-sm font-medium text-ink-body">
                      {String(asRec(c).competitor ?? '')}
                    </span>
                    {asRec(c).differentiation_claim ? (
                      <span className="text-xs italic text-ink-muted">
                        {String(asRec(c).differentiation_claim)}
                      </span>
                    ) : null}
                  </div>
                ))}
                <DeckField
                  label="Comparison table"
                  value={
                    asRec(intel.pitch_deck_extraction.public.competitive_landscape)
                      .objective_comparison
                  }
                  multiline
                />
                <p className="text-xs text-ink-muted">
                  * Competitive framing as positioned by founder
                </p>
              </DeckSection>
            ) : null}

            {/* LP-only sections */}
            {canSeePitchDeck && intel.pitch_deck_extraction.lp_only ? (
              <>
                {asRec(intel.pitch_deck_extraction.lp_only).traction_metrics ? (
                  <DeckSection title="Traction Metrics (Exact)">
                    {Object.entries(
                      asRec(asRec(intel.pitch_deck_extraction.lp_only).traction_metrics),
                    ).map(([k, v]) =>
                      v ? (
                        <DeckField
                          key={k}
                          label={k.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())}
                          value={v}
                        />
                      ) : null,
                    )}
                  </DeckSection>
                ) : null}

                {asRec(intel.pitch_deck_extraction.lp_only).business_model_figures ? (
                  <DeckSection title="Business Model (Figures)">
                    <DeckField
                      label="Take rate"
                      value={
                        asRec(asRec(intel.pitch_deck_extraction.lp_only).business_model_figures)
                          .take_rate
                      }
                    />
                    <DeckField
                      label="Margin claims"
                      value={
                        asRec(asRec(intel.pitch_deck_extraction.lp_only).business_model_figures)
                          .margin_claims
                      }
                    />
                  </DeckSection>
                ) : null}

                {asRec(intel.pitch_deck_extraction.lp_only).funding_history ? (
                  <DeckSection title="Funding History & Ask">
                    <DeckField
                      label="Current ask"
                      value={
                        asRec(asRec(intel.pitch_deck_extraction.lp_only).funding_history)
                          .current_ask
                      }
                    />
                    <DeckField
                      label="Use of funds"
                      value={
                        asRec(asRec(intel.pitch_deck_extraction.lp_only).funding_history)
                          .use_of_funds
                      }
                      multiline
                    />
                    {asArr(
                      asRec(asRec(intel.pitch_deck_extraction.lp_only).funding_history)
                        .previous_rounds,
                    ).map((r, i) => (
                      <div key={i} className="flex flex-col gap-0.5 border-l-2 border-border pl-3">
                        <span className="text-sm font-medium text-ink-body">
                          {[asRec(r).round, asRec(r).amount, asRec(r).date]
                            .filter(Boolean)
                            .map(String)
                            .join(' · ')}
                        </span>
                        {asArr(asRec(r).investors).length ? (
                          <span className="text-xs text-ink-muted">
                            {asArr(asRec(r).investors).map(String).join(', ')}
                          </span>
                        ) : null}
                      </div>
                    ))}
                  </DeckSection>
                ) : null}

                {asRec(intel.pitch_deck_extraction.lp_only).key_risks ? (
                  <DeckSection title="Key Risks">
                    <DeckBullets
                      label="Stated by founder"
                      items={
                        asRec(asRec(intel.pitch_deck_extraction.lp_only).key_risks)
                          .stated_by_founder
                      }
                    />
                    <DeckBullets
                      label="Identified"
                      items={asRec(asRec(intel.pitch_deck_extraction.lp_only).key_risks).identified}
                    />
                  </DeckSection>
                ) : null}

                {asArr(asRec(intel.pitch_deck_extraction.lp_only).data_gaps_flags).length ? (
                  <DeckSection title="Data Gaps & Flags">
                    {asArr(asRec(intel.pitch_deck_extraction.lp_only).data_gaps_flags).map(
                      (f, i) => (
                        <div key={i} className="flex gap-2 text-xs">
                          <span className="font-medium capitalize text-amber-600">
                            {String(asRec(f).type ?? '').replace(/_/g, ' ')}
                          </span>
                          <span className="text-ink-body">
                            {String(asRec(f).description ?? '')}
                          </span>
                        </div>
                      ),
                    )}
                  </DeckSection>
                ) : null}
              </>
            ) : null}
          </CardContent>
        </Card>
      ) : null}

      {/* Evaluation — lp / potential_lp: ai summary + strengths / concerns / recommended LP types */}
      {isInvestor && (detail.ai_pitch_summary || detail.ai_evaluation) ? (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-ink-muted" aria-hidden />
              Pitch Evaluation
            </CardTitle>
            <p className="text-xs text-ink-muted">AI-generated evaluation</p>
          </CardHeader>
          <CardContent className="flex flex-col gap-5">
            {detail.ai_pitch_summary ? (
              <div className="flex flex-col gap-1">
                <span className="text-xs font-semibold uppercase tracking-wide text-ink-muted">
                  Summary
                </span>
                <p className="text-sm text-ink-body">{detail.ai_pitch_summary}</p>
              </div>
            ) : null}
            {detail.ai_evaluation?.strengths?.length ? (
              <div className="flex flex-col gap-2">
                <span className="text-xs font-semibold uppercase tracking-wide text-ink-muted">
                  Strengths
                </span>
                <ul className="flex flex-col gap-1">
                  {detail.ai_evaluation.strengths.map((s, i) => (
                    <li key={i} className="flex gap-2 text-sm text-ink-body">
                      <span className="mt-0.5 shrink-0 font-bold text-emerald-500">+</span>
                      {s}
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
            {detail.ai_evaluation?.concerns?.length ? (
              <div className="flex flex-col gap-2">
                <span className="text-xs font-semibold uppercase tracking-wide text-ink-muted">
                  Concerns
                </span>
                <ul className="flex flex-col gap-1">
                  {detail.ai_evaluation.concerns.map((c, i) => (
                    <li key={i} className="flex gap-2 text-sm text-ink-body">
                      <span className="mt-0.5 shrink-0 font-bold text-amber-500">!</span>
                      {c}
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
            {detail.ai_evaluation?.recommended_lp_types?.length ? (
              <div className="flex flex-col gap-2">
                <span className="text-xs font-semibold uppercase tracking-wide text-ink-muted">
                  Recommended for
                </span>
                <div className="flex flex-wrap gap-1">
                  {detail.ai_evaluation.recommended_lp_types.map((t) => (
                    <Badge key={t} variant="secondary">
                      {t}
                    </Badge>
                  ))}
                </div>
              </div>
            ) : null}
          </CardContent>
        </Card>
      ) : null}

      {/* Internal — admin only */}
      {isAdmin && hasAdminFields ? (
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
            <ExternalLinkRow
              label="Investment memo"
              href={detail.investment_memo_url}
              icon={<FileText className="h-3 w-3 shrink-0 opacity-50" aria-hidden />}
            />
          </CardContent>
        </Card>
      ) : null}
    </>
  );
}

function ExternalLinkRow({
  label,
  href,
  icon,
}: {
  label: string;
  href: string | null | undefined;
  icon?: React.ReactNode;
}) {
  const url = cleanText(href);
  if (!url) return null;
  return (
    <div className="flex flex-col gap-1">
      <span className="text-xs font-semibold uppercase tracking-wide text-ink-muted">{label}</span>
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-1.5 text-sm text-brand hover:underline break-all min-w-0"
        onClick={(e) => e.stopPropagation()}
      >
        {icon}
        <span className="break-all min-w-0">{url}</span>
        <ExternalLink className="h-3 w-3 shrink-0 opacity-50" aria-hidden />
      </a>
    </div>
  );
}
