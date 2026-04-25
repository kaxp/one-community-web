import { useEffect, useRef, type ReactNode } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { stageLabel, fmtCr, fmtChequeRange } from '@/features/search/lib/labels';
import type { LPResultItem, SearchResultItem, StartupResultItem } from '@/features/search/schemas';
import { useLogInteraction } from '@/features/interactions/hooks/use-log-interaction';
import { LockedField } from './LockedField';
import { MaskedCardFooter } from './MaskedCardFooter';

interface Props {
  item: SearchResultItem;
  targetType: 'startup' | 'lp';
  query: string;
  /**
   * When true, render withheld fields as Crunchbase-style locked placeholders
   * instead of hiding them. Set by the page when the viewer is a Partner —
   * the data is still missing on the wire (backend allowlist), the UI just
   * communicates that the structure exists and the data is gated.
   */
  isMasked?: boolean;
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

// Renders either the real value (when present) or a `<LockedField>` placeholder
// (when masked) or `null` (when truly missing for a non-masked viewer).
function FieldOrLocked({
  value,
  isMasked,
  locked,
  rendered,
}: {
  value: unknown;
  isMasked: boolean;
  locked: ReactNode;
  rendered: ReactNode;
}) {
  if (value !== undefined && value !== null && value !== '') return <>{rendered}</>;
  if (isMasked) return <>{locked}</>;
  return null;
}

export function ResultCard({ item, targetType, query, isMasked = false }: Props) {
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
            <div className="min-w-0 flex-1">
              <h3 className="text-base font-semibold text-ink-heading">
                {s.company_name ?? s.name}
              </h3>
              <FieldOrLocked
                value={s.organisation}
                isMasked={isMasked}
                rendered={<p className="text-xs text-ink-muted">{s.organisation}</p>}
                locked={<LockedField className="mt-1 max-w-[10rem]" lines={1} />}
              />
            </div>
            <div className="flex flex-wrap items-center gap-1">
              {s.sector ? <Badge variant="secondary">{s.sector}</Badge> : null}
              {s.stage ? <Badge variant="outline">{stageLabel(s.stage)}</Badge> : null}
            </div>
          </header>

          {s.one_liner ? <p className="text-sm text-ink-heading">{s.one_liner}</p> : null}

          <FieldOrLocked
            value={s.description}
            isMasked={isMasked}
            rendered={<p className="text-sm text-ink-body line-clamp-3">{s.description}</p>}
            locked={<LockedField lines={3} />}
          />
          <FieldOrLocked
            value={s.traction}
            isMasked={isMasked}
            rendered={
              <p className="text-xs text-ink-muted">
                <span className="font-semibold">Traction:</span> {s.traction}
              </p>
            }
            locked={<LockedField label="Traction" lines={1} />}
          />
          <FieldOrLocked
            value={s.funding_target_cr}
            isMasked={isMasked}
            rendered={
              <p className="text-xs text-ink-muted">
                <span className="font-semibold">Asking:</span> {fmtCr(s.funding_target_cr)}
              </p>
            }
            locked={<LockedField label="Asking" lines={1} />}
          />
          <FieldOrLocked
            value={s.ai_reason}
            isMasked={isMasked}
            rendered={
              <p className="rounded-md border border-brand/20 bg-brand/5 p-2 text-xs italic text-brand">
                “{s.ai_reason}”
              </p>
            }
            locked={<LockedField label="AI rank" lines={2} tone="panel" />}
          />

          {isMasked ? <MaskedCardFooter targetUserId={s.user_id} /> : null}
        </CardContent>
      </Card>
    );
  }

  const lp = asLP(item);
  return (
    <Card ref={cardRef} data-testid={`result-card-${lp.user_id}`}>
      <CardContent className="flex flex-col gap-3 p-5">
        <header className="flex flex-wrap items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <h3 className="text-base font-semibold text-ink-heading">{lp.name}</h3>
            <FieldOrLocked
              value={lp.organisation}
              isMasked={isMasked}
              rendered={<p className="text-xs text-ink-muted">{lp.organisation}</p>}
              locked={<LockedField className="mt-1 max-w-[10rem]" lines={1} />}
            />
            <FieldOrLocked
              value={lp.designation}
              isMasked={isMasked}
              rendered={<p className="text-xs text-ink-muted">{lp.designation}</p>}
              locked={<LockedField className="mt-1 max-w-[8rem]" lines={1} />}
            />
          </div>
        </header>

        {lp.fund_name ? <p className="text-sm text-ink-heading">{lp.fund_name}</p> : null}

        <FieldOrLocked
          value={
            lp.cheque_range_min !== undefined || lp.cheque_range_max !== undefined ? true : null
          }
          isMasked={isMasked}
          rendered={
            <p className="text-xs text-ink-muted">
              <span className="font-semibold">Cheque range:</span>{' '}
              {fmtChequeRange(lp.cheque_range_min ?? null, lp.cheque_range_max ?? null)}
            </p>
          }
          locked={<LockedField label="Cheque range" lines={1} />}
        />
        {lp.sectors && lp.sectors.length > 0 ? (
          <p className="text-xs text-ink-muted">
            <span className="font-semibold">Sectors:</span> {lp.sectors.join(', ')}
          </p>
        ) : null}
        <FieldOrLocked
          value={lp.stages && lp.stages.length > 0 ? lp.stages : null}
          isMasked={isMasked}
          rendered={
            <p className="text-xs text-ink-muted">
              <span className="font-semibold">Stages:</span>{' '}
              {(lp.stages ?? []).map((stg) => stageLabel(stg)).join(', ')}
            </p>
          }
          locked={<LockedField label="Stages" lines={1} />}
        />
        <FieldOrLocked
          value={lp.geography && lp.geography.length > 0 ? lp.geography : null}
          isMasked={isMasked}
          rendered={
            <p className="text-xs text-ink-muted">
              <span className="font-semibold">Geography:</span> {(lp.geography ?? []).join(', ')}
            </p>
          }
          locked={<LockedField label="Geography" lines={1} />}
        />
        <FieldOrLocked
          value={lp.ai_reason}
          isMasked={isMasked}
          rendered={
            <p className="rounded-md border border-brand/20 bg-brand/5 p-2 text-xs italic text-brand">
              “{lp.ai_reason}”
            </p>
          }
          locked={<LockedField label="AI rank" lines={2} tone="panel" />}
        />

        {isMasked ? <MaskedCardFooter targetUserId={lp.user_id} /> : null}
      </CardContent>
    </Card>
  );
}
