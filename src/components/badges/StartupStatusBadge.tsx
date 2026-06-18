import { cn } from '@/lib/cn';

function statusColors(status: string): string {
  const s = status.toLowerCase();
  if (s === 'portfolio' || s.includes('invest')) return 'bg-emerald-100 text-emerald-700';
  if (s.includes('partner') || s.includes('referral')) return 'bg-purple-100 text-purple-700';
  if (s.includes('connected') || s.includes('watchlist')) return 'bg-sky-100 text-sky-700';
  if (s.includes('reject') || s.includes('not a fit')) return 'bg-rose-100 text-rose-700';
  if (s.includes('pend') || s.includes('review')) return 'bg-orange-100 text-orange-700';
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
      {status}
    </span>
  );
}
