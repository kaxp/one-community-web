import { Link } from 'react-router-dom';
import { formatDistanceToNow, parseISO } from 'date-fns';
import { ArrowRight, Calendar, Newspaper, Sparkles } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useMyDigests } from '@/features/digest/hooks/use-my-digests';
import { useMatchSuggestions } from '@/features/matchmaking/hooks/use-match-suggestions';
import { useBookings } from '@/features/schedule/hooks/use-bookings';

function DashCard({
  title,
  icon: Icon,
  link,
  linkLabel,
  children,
}: {
  title: string;
  icon: React.ElementType;
  link: string;
  linkLabel: string;
  children: React.ReactNode;
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-semibold text-ink-muted">{title}</CardTitle>
        <Icon className="h-4 w-4 text-ink-muted" aria-hidden />
      </CardHeader>
      <CardContent>
        {children}
        <Button asChild variant="ghost" size="sm" className="mt-3 -ml-2 h-auto p-2">
          <Link to={link} className="inline-flex items-center gap-1 text-xs font-medium text-brand">
            {linkLabel} <ArrowRight className="h-3 w-3" aria-hidden />
          </Link>
        </Button>
      </CardContent>
    </Card>
  );
}

export function LPDashboard() {
  const digests = useMyDigests({ limit: 3 });
  const matches = useMatchSuggestions();
  const bookings = useBookings({ limit: 5 });

  const digestItems = digests.data?.pages[0]?.items ?? [];
  const matchCount = matches.data?.length ?? 0;
  const upcomingBookings = (bookings.data?.pages[0]?.items ?? []).filter(
    (b) => b.status === 'confirmed',
  );

  return (
    <div className="flex flex-col gap-6" data-testid="lp-dashboard">
      <header>
        <h1 className="text-3xl font-semibold text-ink-heading">Dashboard</h1>
        <p className="text-sm text-ink-muted">Your activity at a glance.</p>
      </header>

      <div className="grid gap-4 md:grid-cols-3">
        <DashCard title="Latest digest" icon={Newspaper} link="/digest" linkLabel="View digest">
          {digests.isLoading ? (
            <Skeleton className="h-12 w-full" />
          ) : digestItems.length === 0 ? (
            <p className="text-sm text-ink-muted" data-testid="lp-no-digests">
              No digests yet — your first one arrives Monday.
            </p>
          ) : (
            <div className="flex flex-col gap-1">
              <Badge variant="secondary" className="w-fit">
                {digestItems[0]?.digest_type ?? 'digest'}
              </Badge>
              <span className="text-xs text-ink-muted">
                {digestItems[0]?.sent_at
                  ? formatDistanceToNow(parseISO(digestItems[0].sent_at), { addSuffix: true })
                  : ''}
              </span>
            </div>
          )}
        </DashCard>

        <DashCard
          title="New matches"
          icon={Sparkles}
          link="/matchmaking"
          linkLabel="View suggestions"
        >
          {matches.isLoading ? (
            <Skeleton className="h-10 w-full" />
          ) : (
            <p className="text-3xl font-semibold text-ink-heading" data-testid="lp-match-count">
              {matchCount}
            </p>
          )}
          {matchCount > 0 ? (
            <p className="text-xs text-ink-muted">
              pending suggestion{matchCount !== 1 ? 's' : ''}
            </p>
          ) : null}
        </DashCard>

        <DashCard
          title="Upcoming meetings"
          icon={Calendar}
          link="/schedule"
          linkLabel="Open schedule"
        >
          {bookings.isLoading ? (
            <Skeleton className="h-10 w-full" />
          ) : upcomingBookings.length === 0 ? (
            <p className="text-sm text-ink-muted">No upcoming meetings.</p>
          ) : (
            <p className="text-3xl font-semibold text-ink-heading">{upcomingBookings.length}</p>
          )}
        </DashCard>
      </div>
    </div>
  );
}
