import { Link } from 'react-router-dom';
import { ArrowRight, BarChart3, Calendar, FileText, Users } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useStartupProfile } from '@/features/pitch/hooks/use-startup-profile';
import { useConnectionsPending } from '@/features/connections/hooks/use-connections-pending';
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

export function StartupFundedDashboard() {
  const profile = useStartupProfile();
  const pending = useConnectionsPending({ limit: 10 });
  const bookings = useBookings({ limit: 5 });

  const pitch = profile.data?.status === 'present' ? profile.data.data : null;
  const hasDeck = !!pitch?.deck_url;
  const incomingPending = (pending.data?.pages[0]?.items ?? []).filter(
    (c) => c.direction === 'incoming',
  );
  const upcomingBookings = (bookings.data?.pages[0]?.items ?? []).filter(
    (b) => b.status === 'confirmed',
  );

  return (
    <div className="flex flex-col gap-6" data-testid="startup-funded-dashboard">
      <header>
        <h1 className="text-3xl font-semibold text-ink-heading">Dashboard</h1>
        <p className="text-sm text-ink-muted">Your portfolio status at a glance.</p>
      </header>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <DashCard title="Pitch deck" icon={FileText} link="/pitch" linkLabel="View pitch">
          {profile.isLoading ? (
            <Skeleton className="h-10 w-full" />
          ) : hasDeck ? (
            <Badge variant="success" className="w-fit">
              Deck submitted
            </Badge>
          ) : (
            <p className="text-sm text-ink-muted">No deck uploaded yet.</p>
          )}
        </DashCard>

        <DashCard title="MIS report" icon={BarChart3} link="/mis" linkLabel="Submit MIS">
          <p className="text-sm text-ink-body">
            Upload your monthly investment summary for portfolio tracking.
          </p>
        </DashCard>

        <DashCard
          title="Connection requests"
          icon={Users}
          link="/connections/pending"
          linkLabel="View requests"
        >
          {pending.isLoading ? (
            <Skeleton className="h-10 w-full" />
          ) : (
            <p
              className="text-3xl font-semibold text-ink-heading"
              data-testid="startup-pending-count"
            >
              {incomingPending.length}
            </p>
          )}
          {incomingPending.length > 0 ? (
            <p className="text-xs text-ink-muted">pending incoming</p>
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
