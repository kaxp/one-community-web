import { ExternalLink } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { fmtCr } from '@/features/search/lib/labels';
import type { SearchDetailStartup } from '@/features/search/schemas';
import { InfoRow } from './InfoRow';

interface Props {
  detail: SearchDetailStartup;
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
        className="inline-flex items-center gap-1 text-sm text-brand hover:underline"
        onClick={(e) => e.stopPropagation()}
      >
        {href}
        <ExternalLink className="h-3 w-3 shrink-0" aria-hidden />
      </a>
    </div>
  );
}

export function StartupRichDetailBlock({ detail }: Props) {
  const hasFinancials =
    detail.funding_target_cr != null ||
    detail.mrr_arr ||
    detail.revenue_monthly != null ||
    detail.burn_monthly != null ||
    detail.runway_months != null ||
    detail.existing_investors ||
    detail.money_raised ||
    detail.last_round_valuation ||
    detail.valuation_sought;

  const hasAdminFields =
    detail.ai_pitch_summary ||
    detail.deal_manager ||
    detail.partner_on_call?.length ||
    detail.notion_status ||
    detail.investment_memo_url;

  const hasFounders = detail.founders && detail.founders.length > 0;
  const hasLinks =
    detail.website_url || detail.company_linkedin_url || detail.tracxn_url || detail.pitch_deck_url;

  return (
    <>
      {/* Founders */}
      {hasFounders ? (
        <Card>
          <CardHeader>
            <CardTitle>Founders</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            {detail.founders!.map((f, i) => (
              <div key={i} className="flex flex-col gap-1">
                <p className="text-sm font-semibold text-ink-heading">
                  {f.name ?? 'Unknown founder'}
                  {f.position ? (
                    <span className="ml-2 text-xs font-normal text-ink-muted">— {f.position}</span>
                  ) : null}
                </p>
                {f.description ? <p className="text-sm text-ink-body">{f.description}</p> : null}
                <div className="flex flex-wrap gap-3">
                  {f.linkedin_url ? (
                    <a
                      href={f.linkedin_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-xs text-brand hover:underline"
                      onClick={(e) => e.stopPropagation()}
                    >
                      LinkedIn
                      <ExternalLink className="h-3 w-3" aria-hidden />
                    </a>
                  ) : null}
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
              </div>
            ))}
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
            <ExternalLinkRow label="LinkedIn" href={detail.company_linkedin_url} />
            <ExternalLinkRow label="Tracxn" href={detail.tracxn_url} />
            <ExternalLinkRow label="Pitch deck" href={detail.pitch_deck_url} />
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
              label="Asking"
              value={detail.funding_target_cr != null ? fmtCr(detail.funding_target_cr) : null}
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

      {/* Admin-only: AI signal + internal fields */}
      {hasAdminFields ? (
        <Card>
          <CardHeader>
            <CardTitle>Internal</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {detail.ai_signal ? (
              <div className="sm:col-span-2 flex items-center gap-2">
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
              <div className="sm:col-span-2 flex flex-col gap-1">
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
