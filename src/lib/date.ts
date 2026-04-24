import { format, formatDistanceToNow, parseISO } from 'date-fns';

export function fmtDateTime(iso: string | Date): string {
  const d = typeof iso === 'string' ? parseISO(iso) : iso;
  return format(d, "d MMM yyyy 'at' h:mm a");
}

export function fmtDate(iso: string | Date): string {
  const d = typeof iso === 'string' ? parseISO(iso) : iso;
  return format(d, 'd MMM yyyy');
}

export function relativeFromNow(iso: string | Date): string {
  const d = typeof iso === 'string' ? parseISO(iso) : iso;
  return formatDistanceToNow(d, { addSuffix: true });
}
