import { cn } from '@/lib/cn';

const PALETTE = [
  'bg-sky-100 text-sky-700',
  'bg-cyan-100 text-cyan-700',
  'bg-teal-100 text-teal-700',
  'bg-indigo-100 text-indigo-700',
  'bg-purple-100 text-purple-700',
  'bg-pink-100 text-pink-700',
  'bg-orange-100 text-orange-700',
  'bg-lime-100 text-lime-700',
  'bg-rose-100 text-rose-700',
  'bg-emerald-100 text-emerald-700',
];

function paletteIndex(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) & 0xffff;
  return h % PALETTE.length;
}

export function SectorBadge({ sector }: { sector: string }) {
  return (
    <span
      className={cn(
        'inline-flex items-center whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-medium',
        PALETTE[paletteIndex(sector.toLowerCase())],
      )}
    >
      {sector}
    </span>
  );
}

export function SectorBadgeList({ sectors, max = 2 }: { sectors: string[]; max?: number }) {
  if (!sectors.length) return <span className="text-sm text-ink-muted">—</span>;
  return (
    <div className="flex flex-wrap gap-1">
      {sectors.slice(0, max).map((s) => (
        <SectorBadge key={s} sector={s} />
      ))}
      {sectors.length > max ? (
        <span className="text-xs text-ink-muted">+{sectors.length - max}</span>
      ) : null}
    </div>
  );
}
