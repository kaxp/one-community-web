import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import type { SearchAnswer, StartupResultItem } from '@/features/search/schemas';

interface Props {
  answer: SearchAnswer;
  resultsByUserId: Record<string, StartupResultItem>;
}

/**
 * Cosmic-style synthesised answer renderer.
 *
 * Layout: intro paragraph → grouped headings, each with a list of cards
 * showing company name + sector + concrete-fit explanation + "Know more"
 * deep link to the startup detail page. Closes with a follow-up prompt
 * when the synthesizer suggested one.
 *
 * Cards referenced by `startup_id` are looked up in `resultsByUserId` so
 * we keep all the role-masked data (sector, stage) without duplicating it
 * into the answer payload.
 */
export function SearchAnswerBlock({ answer, resultsByUserId }: Props) {
  return (
    <div
      className="flex flex-col gap-6 rounded-lg border border-border bg-surface p-5 sm:p-6"
      data-testid="search-answer-block"
    >
      {/* Intro */}
      <p className="text-sm leading-relaxed text-ink-body sm:text-base">{answer.intro}</p>

      {/* Groups */}
      <div className="flex flex-col gap-6">
        {answer.groups.map((group, gi) => (
          <section key={`group-${gi}`} className="flex flex-col gap-3">
            <h3 className="text-sm font-semibold uppercase tracking-wide text-ink-muted">
              {group.heading}
            </h3>
            <ul className="flex flex-col gap-3">
              {group.items.map((item) => {
                const card = resultsByUserId[item.startup_id];
                const detailPath = `/search/profile/${item.startup_id}`;
                return (
                  <li
                    key={item.startup_id}
                    className="flex flex-col gap-2 rounded-md border border-border bg-surface-muted p-3 sm:p-4"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
                        <Link
                          to={detailPath}
                          className="text-base font-semibold text-ink-heading hover:text-brand hover:underline"
                        >
                          {card?.company_name ?? '—'}
                        </Link>
                        {card?.sector ? (
                          <Badge variant="secondary" className="text-[10px]">
                            {card.sector}
                          </Badge>
                        ) : null}
                        {card?.stage ? (
                          <Badge variant="outline" className="text-[10px]">
                            {card.stage.replace(/_/g, ' ')}
                          </Badge>
                        ) : null}
                      </div>
                      <Button variant="outline" size="sm" asChild>
                        <Link
                          to={detailPath}
                          aria-label={`Know more about ${card?.company_name ?? ''}`}
                        >
                          Know more
                          <ArrowRight className="ml-1 h-3.5 w-3.5" aria-hidden />
                        </Link>
                      </Button>
                    </div>
                    <p className="text-sm leading-relaxed text-ink-body">{item.explanation}</p>
                  </li>
                );
              })}
            </ul>
          </section>
        ))}
      </div>

      {/* Follow-up */}
      {answer.follow_up ? (
        <p
          className="border-t border-border pt-4 text-sm italic text-ink-muted"
          data-testid="search-answer-followup"
        >
          {answer.follow_up}
        </p>
      ) : null}
    </div>
  );
}
