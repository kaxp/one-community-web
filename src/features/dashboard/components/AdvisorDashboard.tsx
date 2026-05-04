import { Clock } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';

export function AdvisorDashboard() {
  return (
    <div className="flex flex-col gap-6" data-testid="advisor-dashboard">
      <header>
        <h1 className="text-3xl font-semibold text-ink-heading">Dashboard</h1>
        <p className="text-sm text-ink-muted">Welcome to One Community.</p>
      </header>

      <Card className="max-w-lg">
        <CardHeader className="flex flex-row items-center gap-3 space-y-0">
          <Clock className="h-5 w-5 flex-none text-ink-muted" aria-hidden />
          <div>
            <CardTitle>Advisor flows coming soon</CardTitle>
            <CardDescription>
              Welcome — your advisor-specific features are planned for a future release.
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-ink-body">
            In the meantime you can view your profile, manage your schedule, and respond to
            connection requests from the sidebar.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
