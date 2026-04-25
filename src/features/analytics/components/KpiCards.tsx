import type { ReactNode } from 'react';
import {
  BarChart3,
  Briefcase,
  Building2,
  Calendar,
  Inbox,
  Mail,
  Sparkles,
  Users,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import type { AnalyticsOverview } from '@/features/analytics/schemas';

interface KpiSpec {
  key: keyof AnalyticsOverview;
  label: string;
  icon: ReactNode;
}

// PRD §7.14.1 — top-level KPI cards. Render only the documented keys; new
// keys arriving from the backend are visible in the debug dock but not in
// the dashboard until a code change adds them here.
const KPIS: KpiSpec[] = [
  { key: 'users_total', label: 'Total users', icon: <Users className="h-4 w-4" /> },
  { key: 'lps_total', label: 'LPs', icon: <Briefcase className="h-4 w-4" /> },
  { key: 'startups_total', label: 'Startups', icon: <Building2 className="h-4 w-4" /> },
  {
    key: 'connections_accepted',
    label: 'Connections accepted',
    icon: <Sparkles className="h-4 w-4" />,
  },
  {
    key: 'connections_pending',
    label: 'Connections pending',
    icon: <Inbox className="h-4 w-4" />,
  },
  {
    key: 'meetings_scheduled_30d',
    label: 'Meetings (30d)',
    icon: <Calendar className="h-4 w-4" />,
  },
  { key: 'digests_sent_30d', label: 'Digests sent (30d)', icon: <Mail className="h-4 w-4" /> },
  {
    key: 'mis_submissions_this_month',
    label: 'MIS this month',
    icon: <BarChart3 className="h-4 w-4" />,
  },
];

interface Props {
  overview: AnalyticsOverview;
}

function fmt(value: number | undefined | null): string {
  return ((value ?? 0) as number).toLocaleString('en-IN');
}

export function KpiCards({ overview }: Props) {
  return (
    <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {KPIS.map((kpi) => (
        <Card key={kpi.key} data-testid={`kpi-${String(kpi.key)}`}>
          <CardContent className="flex flex-col gap-1 p-4">
            <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-wide text-ink-muted">
              <span>{kpi.label}</span>
              <span className="text-ink-muted">{kpi.icon}</span>
            </div>
            <p className="text-2xl font-semibold text-ink-heading">
              {fmt(overview[kpi.key] as number | undefined)}
            </p>
          </CardContent>
        </Card>
      ))}
    </section>
  );
}
