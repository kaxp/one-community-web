import { useEffect, useRef } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { stageLabel, fmtCr, fmtChequeRange } from '@/features/search/lib/labels';
import type { LPResultItem, SearchResultItem, StartupResultItem } from '@/features/search/schemas';
import { useLogInteraction } from '@/features/interactions/hooks/use-log-interaction';
import { cn } from '@/lib/cn';

interface Props {
  item: SearchResultItem;
  targetType: 'startup' | 'lp';
  query: string;
}

// Narrow the union by `targetType`. The Zod schemas tag each variant on the response
// `target_type` field, but individual items don't carry the discriminator — the page
// passes `targetType` down and we cast through it locally.
function asStartup(item: SearchResultItem): StartupResultItem {
  return item as StartupResultItem;
}
function asLP(item: SearchResultItem): LPResultItem {
  return item as LPResultItem;
}

// Defensive rendering: Partner-masked responses (PRD §7.4.1) only surface
// { user_id, name, organisation, sector, stage, one_liner }. Any field that is
// missing or null is hidden — never render "null" or an empty bar (CLAUDE.md §11.2).
export function ResultCard({ item, targetType, query }: Props) {
  const cardRef = useRef<HTMLDivElement | null>(null);
  const log = useLogInteraction();

  // Fire `search_view` once when the card scrolls into view (or immediately if
  // IntersectionObserver isn't available — e.g., jsdom).
  useEffect(() => {
    const target_id = item.user_id;
    const fire = () =>
      log({
        target_id,
        interaction_type: 'search_view',
        target_type: targetType,
        source: 'search_card',
        metadata: { query },
      });

    if (typeof IntersectionObserver === 'undefined' || !cardRef.current) {
      fire();
      return;
    }
    const node = cardRef.current;
    const observer = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            fire();
            observer.disconnect();
            return;
          }
        }
      },
      { threshold: 0.4 },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [item.user_id, targetType, query, log]);

  if (targetType === 'startup') {
    const s = asStartup(item);
    return (
      <Card ref={cardRef} data-testid={`result-card-${s.user_id}`}>
        <CardContent className="flex flex-col gap-3 p-5">
          <header className="flex flex-wrap items-start justify-between gap-2">
            <div>
              <h3 className="text-base font-semibold text-ink-heading">
                {s.company_name ?? s.name}
              </h3>
              {s.organisation ? <p className="text-xs text-ink-muted">{s.organisation}</p> : null}
            </div>
            <div className="flex flex-wrap items-center gap-1">
              {s.sector ? <Badge variant="secondary">{s.sector}</Badge> : null}
              {s.stage ? <Badge variant="outline">{stageLabel(s.stage)}</Badge> : null}
            </div>
          </header>

          {s.one_liner ? <p className="text-sm text-ink-heading">{s.one_liner}</p> : null}
          {s.description ? (
            <p className="text-sm text-ink-body line-clamp-3">{s.description}</p>
          ) : null}
          {s.traction ? (
            <p className="text-xs text-ink-muted">
              <span className="font-semibold">Traction:</span> {s.traction}
            </p>
          ) : null}
          {s.funding_target_cr !== undefined && s.funding_target_cr !== null ? (
            <p className="text-xs text-ink-muted">
              <span className="font-semibold">Asking:</span> {fmtCr(s.funding_target_cr)}
            </p>
          ) : null}
          {s.ai_reason ? (
            <p
              className={cn(
                'rounded-md border border-brand/20 bg-brand/5 p-2 text-xs italic text-brand',
              )}
            >
              “{s.ai_reason}”
            </p>
          ) : null}
        </CardContent>
      </Card>
    );
  }

  const lp = asLP(item);
  return (
    <Card ref={cardRef} data-testid={`result-card-${lp.user_id}`}>
      <CardContent className="flex flex-col gap-3 p-5">
        <header className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <h3 className="text-base font-semibold text-ink-heading">{lp.name}</h3>
            {lp.organisation ? <p className="text-xs text-ink-muted">{lp.organisation}</p> : null}
            {lp.designation ? <p className="text-xs text-ink-muted">{lp.designation}</p> : null}
          </div>
        </header>

        {lp.fund_name ? <p className="text-sm text-ink-heading">{lp.fund_name}</p> : null}
        {lp.cheque_range_min !== undefined || lp.cheque_range_max !== undefined ? (
          <p className="text-xs text-ink-muted">
            <span className="font-semibold">Cheque range:</span>{' '}
            {fmtChequeRange(lp.cheque_range_min ?? null, lp.cheque_range_max ?? null)}
          </p>
        ) : null}
        {lp.sectors && lp.sectors.length > 0 ? (
          <p className="text-xs text-ink-muted">
            <span className="font-semibold">Sectors:</span> {lp.sectors.join(', ')}
          </p>
        ) : null}
        {lp.stages && lp.stages.length > 0 ? (
          <p className="text-xs text-ink-muted">
            <span className="font-semibold">Stages:</span>{' '}
            {lp.stages.map((stg) => stageLabel(stg)).join(', ')}
          </p>
        ) : null}
        {lp.geography && lp.geography.length > 0 ? (
          <p className="text-xs text-ink-muted">
            <span className="font-semibold">Geography:</span> {lp.geography.join(', ')}
          </p>
        ) : null}
        {lp.ai_reason ? (
          <p
            className={cn(
              'rounded-md border border-brand/20 bg-brand/5 p-2 text-xs italic text-brand',
            )}
          >
            “{lp.ai_reason}”
          </p>
        ) : null}
      </CardContent>
    </Card>
  );
}
