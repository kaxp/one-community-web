import { cn } from '@/lib/cn';
import { STARTUP_STATUS_FILTER_OPTIONS } from '@/features/admin/schemas';

const STATUS_LABEL: Record<string, string> = Object.fromEntries(
  STARTUP_STATUS_FILTER_OPTIONS.map((o) => [o.value, o.label]),
);

function statusColors(status: string): string {
  const s = status.toLowerCase();
  if (s === 'portfolio') return 'bg-emerald-100 text-emerald-700';
  if (s === 'ib_mandate' || s === 'termsheet_discussion') return 'bg-teal-100 text-teal-700';
  if (s === 'deep_dive_scheduled' || s === 'data_received') return 'bg-cyan-100 text-cyan-700';
  if (s === 'partner_intro_scheduled' || s === 'schedule_partner_intro_call')
    return 'bg-indigo-100 text-indigo-700';
  if (s.includes('feedback') || s.includes('calls')) return 'bg-purple-100 text-purple-700';
  if (s === 'stay_connected' || s === 'on_hold') return 'bg-sky-100 text-sky-700';
  if (s === 'partner_ref_reachouts' || s === 'team_reach_out') return 'bg-pink-100 text-pink-700';
  if (s === 'longlist' || s === 'request_data') return 'bg-orange-100 text-orange-700';
  if (
    s === 'pass_for_now' ||
    s === 'not_shortlisted' ||
    s === 'not_responsive' ||
    s === 'straight_pass'
  )
    return 'bg-rose-100 text-rose-700';
  return 'bg-slate-100 text-slate-600';
}

export function StartupStatusBadge({ status }: { status: string | null | undefined }) {
  if (!status) return <span className="text-sm text-ink-muted">—</span>;
  return (
    <span
      className={cn(
        'inline-flex items-center whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-medium',
        statusColors(status),
      )}
    >
      {STATUS_LABEL[status] ?? status.replace(/_/g, ' ')}
    </span>
  );
}
