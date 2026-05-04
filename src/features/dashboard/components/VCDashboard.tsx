import { Link } from 'react-router-dom';
import { ArrowRight, Calendar, Eye, Sparkles } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useMatchSuggestions } from '@/features/matchmaking/hooks/use-match-suggestions';
import { useBookings } from '@/features/schedule/hooks/use-bookings';
import { useProfileViewers } from '@/features/profile-viewers/hooks/use-profile-viewers';

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

export function VCDashboard() {
  const matches = useMatchSuggestions();
  const bookings = useBookings({ limit: 5 });
  const viewers = useProfileViewers({ limit: 5 });

  const matchCount = matches.data?.length ?? 0;
  const upcomingBookings = (bookings.data?.pages[0]?.items ?? []).filter(
    (b) => b.status === 'confirmed',
  );
  const viewerCount = viewers.data?.pages[0]?.items.length ?? 0;

  return (
    <div className="flex flex-col gap-6" data-testid="vc-dashboard">
      <header>
        <h1 className="text-3xl font-semibold text-ink-heading">Dashboard</h1>
        <p className="text-sm text-ink-muted">Your activity at a glance.</p>
      </header>

      <div className="grid gap-4 md:grid-cols-3">
        <DashCard
          title="New matches"
          icon={Sparkles}
          link="/matchmaking"
          linkLabel="View suggestions"
        >
          {matches.isLoading ? (
            <Skeleton className="h-10 w-full" />
          ) : (
            <p className="text-3xl font-semibold text-ink-heading" data-testid="vc-match-count">
              {matchCount}
            </p>
          )}
        </DashCard>

        <DashCard
          title="Profile views"
          icon={Eye}
          link="/profile-viewers"
          linkLabel="See who viewed"
        >
          {viewers.isLoading ? (
            <Skeleton className="h-10 w-full" />
          ) : (
            <p className="text-3xl font-semibold text-ink-heading">{viewerCount}</p>
          )}
          <p className="text-xs text-ink-muted">recent viewer{viewerCount !== 1 ? 's' : ''}</p>
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
