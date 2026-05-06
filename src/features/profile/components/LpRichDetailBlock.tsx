import { ExternalLink } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { fmtChequeRange } from '@/features/search/lib/labels';
import type { SearchDetailLp } from '@/features/search/schemas';
import { InfoRow } from './InfoRow';

interface Props {
  detail: SearchDetailLp;
}

export function LpRichDetailBlock({ detail }: Props) {
  const hasFundInfo =
    detail.fund_name ||
    detail.lp_type ||
    detail.aum_cr != null ||
    detail.cheque_range_min != null ||
    detail.cheque_range_max != null ||
    detail.expected_ticket ||
    detail.sectors?.length ||
    detail.stages?.length ||
    detail.geography?.length ||
    detail.co_invest_interest != null;

  const hasContact = detail.linkedin_url || detail.email || detail.phone;

  return (
    <>
      {hasFundInfo ? (
        <Card>
          <CardHeader>
            <CardTitle>Investment profile</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <InfoRow label="Fund" value={detail.fund_name} isMasked={false} />
            <InfoRow label="Type" value={detail.lp_type} isMasked={false} />
            <InfoRow
              label="AUM"
              value={detail.aum_cr != null ? `₹${detail.aum_cr} Cr` : null}
              isMasked={false}
            />
            <InfoRow
              label="Cheque range"
              value={
                detail.cheque_range_min != null || detail.cheque_range_max != null
                  ? fmtChequeRange(detail.cheque_range_min ?? null, detail.cheque_range_max ?? null)
                  : null
              }
              isMasked={false}
            />
            <InfoRow label="Expected ticket" value={detail.expected_ticket} isMasked={false} />
            <InfoRow
              label="Co-invest"
              value={
                detail.co_invest_interest != null
                  ? detail.co_invest_interest
                    ? 'Interested'
                    : 'Not interested'
                  : null
              }
              isMasked={false}
            />
            <InfoRow label="City" value={detail.city} isMasked={false} />
            {detail.sectors?.length ? (
              <div className="sm:col-span-2 flex flex-col gap-1">
                <span className="text-xs font-semibold uppercase tracking-wide text-ink-muted">
                  Sectors
                </span>
                <span className="text-sm text-ink-heading">{detail.sectors.join(', ')}</span>
              </div>
            ) : null}
            {detail.stages?.length ? (
              <div className="flex flex-col gap-1">
                <span className="text-xs font-semibold uppercase tracking-wide text-ink-muted">
                  Stages
                </span>
                <span className="text-sm text-ink-heading">{detail.stages.join(', ')}</span>
              </div>
            ) : null}
            {detail.geography?.length ? (
              <div className="flex flex-col gap-1">
                <span className="text-xs font-semibold uppercase tracking-wide text-ink-muted">
                  Geography
                </span>
                <span className="text-sm text-ink-heading">{detail.geography.join(', ')}</span>
              </div>
            ) : null}
            {detail.description ? (
              <div className="sm:col-span-2 flex flex-col gap-1">
                <span className="text-xs font-semibold uppercase tracking-wide text-ink-muted">
                  About
                </span>
                <p className="text-sm text-ink-body">{detail.description}</p>
              </div>
            ) : null}
          </CardContent>
        </Card>
      ) : null}

      {hasContact ? (
        <Card>
          <CardHeader>
            <CardTitle>Contact</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {detail.linkedin_url ? (
              <div className="flex flex-col gap-1">
                <span className="text-xs font-semibold uppercase tracking-wide text-ink-muted">
                  LinkedIn
                </span>
                <a
                  href={detail.linkedin_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-sm text-brand hover:underline"
                  onClick={(e) => e.stopPropagation()}
                >
                  {detail.linkedin_url}
                  <ExternalLink className="h-3 w-3 shrink-0" aria-hidden />
                </a>
              </div>
            ) : null}
            <InfoRow label="Email" value={detail.email} isMasked={false} />
            <InfoRow label="Phone" value={detail.phone} isMasked={false} />
          </CardContent>
        </Card>
      ) : null}
    </>
  );
}
