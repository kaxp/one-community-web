import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useUser } from '@/auth/use-auth';

export function DashboardPage() {
  const user = useUser();

  return (
    <div className="flex flex-col gap-6" data-testid="dashboard-root">
      <div>
        <h1 className="text-3xl font-semibold text-ink-heading">Dashboard</h1>
        <p className="text-sm text-ink-muted">
          {user ? `Signed in as ${user.name ?? user.phone}` : 'Scaffold — not yet signed in'}
        </p>
      </div>

      {/* Visual brand smoke test per queue.md Stage 1: one Button, one Card, one success Badge. */}
      <section
        aria-label="Brand smoke test"
        className="grid gap-4 md:grid-cols-3"
        data-testid="brand-smoke"
      >
        <Card>
          <CardHeader>
            <CardTitle>Card</CardTitle>
            <CardDescription>White surface with muted border &amp; subtle shadow.</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-ink-body">
              This is the default card surface the whole product will sit on.
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Button</CardTitle>
            <CardDescription>Primary CTA uses the Warmup blue.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button data-testid="brand-smoke-button">Primary action</Button>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Badge</CardTitle>
            <CardDescription>Semantic status colour sample.</CardDescription>
          </CardHeader>
          <CardContent>
            <Badge variant="success" data-testid="brand-smoke-badge">
              Success
            </Badge>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
