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
  tooltip: string;
}

// PRD §7.14.1 — top-level KPI cards. Render only the documented keys; new
// keys arriving from the backend are visible in the debug dock but not in
// the dashboard until a code change adds them here.
const KPIS: KpiSpec[] = [
  {
    key: 'total_users',
    label: 'Total users',
    icon: <Users className="h-4 w-4" />,
    tooltip: 'Total registered users across all roles',
  },
  {
    key: 'lps',
    label: 'LPs',
    icon: <Briefcase className="h-4 w-4" />,
    tooltip: 'Users with role: LP (Limited Partner)',
  },
  {
    key: 'potential_lps',
    label: 'Potential LPs',
    icon: <Briefcase className="h-4 w-4" />,
    tooltip: 'Users with role: Potential LP (pending upgrade)',
  },
  {
    key: 'startups',
    label: 'Startups',
    icon: <Building2 className="h-4 w-4" />,
    tooltip: 'Users with startup roles: In Progress, Onboarded, or Funded',
  },
  {
    key: 'connections_accepted',
    label: 'Connections accepted',
    icon: <Sparkles className="h-4 w-4" />,
    tooltip: 'Connection requests accepted by both parties',
  },
  {
    key: 'connections_pending',
    label: 'Connections pending',
    icon: <Inbox className="h-4 w-4" />,
    tooltip: 'Connection requests awaiting admin approval',
  },
  {
    key: 'meetings_30d',
    label: 'Meetings (30d)',
    icon: <Calendar className="h-4 w-4" />,
    tooltip: 'Meetings scheduled in the last 30 days',
  },
  {
    key: 'digests_sent_30d',
    label: 'Digests sent (30d)',
    icon: <Mail className="h-4 w-4" />,
    tooltip: 'Digest emails sent in the last 30 days',
  },
  {
    key: 'mis_this_month',
    label: 'MIS this month',
    icon: <BarChart3 className="h-4 w-4" />,
    tooltip: 'MIS reports submitted this month',
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
              <span className="flex items-center gap-1">
                {kpi.label}
                <span title={kpi.tooltip} className="cursor-help text-ink-muted">
                  ⓘ
                </span>
              </span>
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
