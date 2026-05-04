import { Link } from 'react-router-dom';
import { ArrowRight, Search, Users } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useConnections } from '@/features/connections/hooks/use-connections';

export function PartnerDashboard() {
  const connections = useConnections({ limit: 5 });
  const connectionCount = connections.data?.pages[0]?.items.length ?? 0;

  return (
    <div className="flex flex-col gap-6" data-testid="partner-dashboard">
      <header>
        <h1 className="text-3xl font-semibold text-ink-heading">Dashboard</h1>
        <p className="text-sm text-ink-muted">Your partner activity at a glance.</p>
      </header>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-semibold text-ink-muted">Connections</CardTitle>
            <Users className="h-4 w-4 text-ink-muted" aria-hidden />
          </CardHeader>
          <CardContent>
            {connections.isLoading ? (
              <Skeleton className="h-10 w-full" />
            ) : (
              <p
                className="text-3xl font-semibold text-ink-heading"
                data-testid="partner-connection-count"
              >
                {connectionCount}
              </p>
            )}
            <p className="text-xs text-ink-muted">
              accepted connection{connectionCount !== 1 ? 's' : ''}
            </p>
            <Button asChild variant="ghost" size="sm" className="mt-3 -ml-2 h-auto p-2">
              <Link
                to="/connections"
                className="inline-flex items-center gap-1 text-xs font-medium text-brand"
              >
                View connections <ArrowRight className="h-3 w-3" aria-hidden />
              </Link>
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-semibold text-ink-muted">
              Discover startups
            </CardTitle>
            <Search className="h-4 w-4 text-ink-muted" aria-hidden />
          </CardHeader>
          <CardContent>
            <p className="text-sm text-ink-body">
              Browse startups and LPs in the community. Request a connection to unlock contact
              details.
            </p>
            <Button asChild size="sm" className="mt-3" data-testid="partner-search-cta">
              <Link to="/search">Search community</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
