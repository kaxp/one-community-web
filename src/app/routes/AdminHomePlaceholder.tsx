import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default function AdminHomePlaceholder() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Admin home</CardTitle>
        <CardDescription>
          Full KPI dashboard ships in Stage 4 (queue.md). This placeholder exists so the admin route
          tree + RoleGuard can be exercised at Stage 1.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-ink-body">
          You are signed in as an administrator. Downstream admin pages build on this route.
        </p>
      </CardContent>
    </Card>
  );
}
