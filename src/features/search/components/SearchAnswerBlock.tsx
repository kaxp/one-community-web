import { Link } from 'react-router-dom';
import { ArrowUpRight } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import type { SearchAnswer, StartupResultItem } from '@/features/search/schemas';

interface Props {
  answer: SearchAnswer;
  resultsByUserId: Record<string, StartupResultItem>;
}

/**
 * Cosmic / ChatGPT-style answer renderer. Handles all three v4 synth shapes:
 *
 *   list shape     (discover, rank)       → groups with company items + nav links
 *   analysis shape (drill_in, bear, bull) → sections with heading + body paragraphs
 *   redirect shape (meta, entity_not_found) → pivot text + optional alternatives
 *
 * Plain prose, no outer card. Intro and follow-up always render; the middle
 * section switches based on which fields are populated.
 */
export function SearchAnswerBlock({ answer, resultsByUserId }: Props) {
  const hasGroups = (answer.groups ?? []).length > 0;
  const hasSections = (answer.sections ?? []).length > 0;
  const hasAlternatives = (answer.alternatives ?? []).length > 0;

  return (
    <div className="flex flex-col gap-5" data-testid="search-answer-block">
      {/* Intro — directive prose, no border */}
      <p className="text-[15px] leading-relaxed text-ink-body sm:text-base">{answer.intro}</p>

      {/* ── LIST shape (discover, rank) ─────────────────────────────────── */}
      {hasGroups
        ? (answer.groups ?? []).map((group, gi) => (
            <section key={`group-${gi}`} className="flex flex-col gap-3">
              <h3 className="text-[15px] font-semibold text-ink-heading">{group.heading}</h3>
              <ul className="flex flex-col gap-3">
                {group.items.map((item) => {
                  const card = resultsByUserId[item.startup_id];
                  const detailPath = `/search/profile/${item.startup_id}`;
                  // item.name (from v4 synth) takes priority so we can render
                  // even when the card isn't in resultsByUserId.
                  const companyName = item.name ?? card?.company_name ?? '—';
                  return (
                    <li
                      key={item.startup_id}
                      className="flex flex-col gap-1.5 border-l-2 border-border pl-3"
                    >
                      <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
                        <Link
                          to={detailPath}
                          className="text-[15px] font-semibold text-ink-heading hover:text-brand hover:underline"
                        >
                          {companyName}
                        </Link>
                        {card?.sector ? (
                          <span className="text-xs text-ink-muted">{card.sector}</span>
                        ) : null}
                        {card?.stage ? (
                          <Badge variant="outline" className="text-[10px]">
                            {card.stage.replace(/_/g, ' ')}
                          </Badge>
                        ) : null}
                      </div>
                      <p className="text-[14px] leading-relaxed text-ink-body">
                        {item.explanation}
                      </p>
                      <Link
                        to={detailPath}
                        className="inline-flex w-fit items-center gap-1 text-xs text-brand hover:underline"
                        aria-label={`Know more about ${companyName}`}
                      >
                        Know more
                        <ArrowUpRight className="h-3 w-3" aria-hidden />
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </section>
          ))
        : null}

      {/* ── ANALYSIS shape (drill_in, bear, bull, compare) ──────────────── */}
      {hasSections ? (
        <div className="flex flex-col gap-4" data-testid="search-answer-sections">
          {(answer.sections ?? []).map((section, si) => (
            <div key={`section-${si}`} className="flex flex-col gap-1.5">
              <h3 className="text-[14px] font-semibold text-ink-heading">{section.heading}</h3>
              <p className="text-[14px] leading-relaxed text-ink-body">{section.body}</p>
            </div>
          ))}
          {answer.verdict ? (
            <p
              className="border-l-2 border-brand/40 pl-3 text-[14px] italic leading-relaxed text-ink-muted"
              data-testid="search-answer-verdict"
            >
              {answer.verdict}
            </p>
          ) : null}
        </div>
      ) : null}

      {/* ── REDIRECT shape (meta, entity_not_found) ─────────────────────── */}
      {answer.pivot ? (
        <p className="text-[14px] leading-relaxed text-ink-body" data-testid="search-answer-pivot">
          {answer.pivot}
        </p>
      ) : null}
      {hasAlternatives ? (
        <div className="flex flex-wrap gap-2" data-testid="search-answer-alternatives">
          {(answer.alternatives ?? []).map((alt) => (
            <Link
              key={alt.startup_id}
              to={`/search/profile/${alt.startup_id}`}
              className="inline-flex items-center gap-1 rounded-full border border-brand/30 bg-brand/5 px-3 py-1 text-[13px] text-brand hover:bg-brand/10 hover:underline"
            >
              {alt.name}
              <ArrowUpRight className="h-3 w-3" aria-hidden />
            </Link>
          ))}
        </div>
      ) : null}

      {/* Follow-up — italic prose, shared across all shapes */}
      {answer.follow_up ? (
        <p
          className="text-[14px] italic leading-relaxed text-ink-muted"
          data-testid="search-answer-followup"
        >
          {answer.follow_up}
        </p>
      ) : null}
    </div>
  );
}
