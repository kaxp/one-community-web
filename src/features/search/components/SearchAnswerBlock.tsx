import { Link } from 'react-router-dom';
import { ArrowUpRight } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import type { SearchAnswer, StartupResultItem } from '@/features/search/schemas';

interface Props {
  answer: SearchAnswer;
  resultsByUserId: Record<string, StartupResultItem>;
}

/**
 * Cosmic / ChatGPT-style answer renderer.
 *
 * Plain prose, no outer card, no per-item card backgrounds. The synthesized
 * intro and follow-up read as natural text. Each result is an inline item:
 * bold linked company name + small inline meta + the concrete explanation
 * underneath. The "Know more" affordance is a small inline link rather than
 * a button so the visual weight stays on the prose.
 *
 * Group headings are regular subheadings (not uppercase tracking-wide) so
 * they sit in the prose hierarchy rather than feeling like UI chrome.
 */
export function SearchAnswerBlock({ answer, resultsByUserId }: Props) {
  return (
    <div className="flex flex-col gap-5" data-testid="search-answer-block">
      {/* Intro — directive prose, no border */}
      <p className="text-[15px] leading-relaxed text-ink-body sm:text-base">{answer.intro}</p>

      {/* Groups — each is a section of inline prose, no containers */}
      {answer.groups.map((group, gi) => (
        <section key={`group-${gi}`} className="flex flex-col gap-3">
          <h3 className="text-[15px] font-semibold text-ink-heading">{group.heading}</h3>
          <ul className="flex flex-col gap-3">
            {answer.groups.length === 0 ? null : null}
            {group.items.map((item) => {
              const card = resultsByUserId[item.startup_id];
              const detailPath = `/search/profile/${item.startup_id}`;
              const companyName = card?.company_name ?? '—';
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
                  <p className="text-[14px] leading-relaxed text-ink-body">{item.explanation}</p>
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
      ))}

      {/* Follow-up — italic prose, no border */}
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
