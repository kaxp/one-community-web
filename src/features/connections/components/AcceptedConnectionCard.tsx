import { Link } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { RoleBadge } from '@/components/role-badge';
import { ContactStrip } from './ContactStrip';
import { FeedbackPrompt } from './FeedbackPrompt';
import type { AcceptedConnection } from '@/features/connections/schemas';
import { fmtDate } from '@/lib/date';

interface Props {
  row: AcceptedConnection;
}

// PRD §7.6.4 — accepted connection card. Counterpart name + role + organisation;
// contact strip ONLY when `contact !== null`. If the row has an `intro_id` and
// `feedback_submitted !== true`, surface the 48h feedback prompt below.
export function AcceptedConnectionCard({ row }: Props) {
  const c = row.counterpart;
  const showFeedback =
    !!row.intro_id && row.feedback_submitted !== true && row.status === 'accepted';

  return (
    <div className="flex flex-col gap-2">
      <Card data-testid={`connection-${row.connection_id}`}>
        <CardContent className="flex flex-col gap-3 p-5">
          <header className="flex flex-wrap items-start justify-between gap-2">
            <div className="min-w-0">
              <Link
                to={`/profile/${c.user_id}`}
                className="text-base font-semibold text-ink-heading hover:text-brand"
              >
                {c.name}
              </Link>
              {c.organisation ? <p className="text-xs text-ink-muted">{c.organisation}</p> : null}
            </div>
            <RoleBadge role={c.role} className="self-start" />
          </header>

          {c.contact ? <ContactStrip contact={c.contact} /> : null}

          {row.responded_at ? (
            <p className="text-xs text-ink-muted">Connected {fmtDate(row.responded_at)}</p>
          ) : null}
        </CardContent>
      </Card>
      {showFeedback ? (
        <FeedbackPrompt introId={row.intro_id as string} counterpartName={c.name} />
      ) : null}
    </div>
  );
}
