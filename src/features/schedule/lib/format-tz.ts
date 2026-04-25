import { format } from 'date-fns';
import { toZonedTime } from 'date-fns-tz';

// PRD §8.12.2 — render an ISO-8601-with-TZ timestamp in the viewer's local
// timezone. We resolve the viewer's TZ once via Intl.DateTimeFormat so the
// label tracks where the user actually is. date-fns-tz v3 exposes
// `toZonedTime` (renamed from v2's `utcToZonedTime`).
export function viewerTimeZone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
  } catch {
    return 'UTC';
  }
}

export function fmtSlotTime(iso: string, tz: string = viewerTimeZone()): string {
  return format(toZonedTime(iso, tz), 'h:mm a');
}

export function fmtSlotDate(iso: string, tz: string = viewerTimeZone()): string {
  return format(toZonedTime(iso, tz), 'EEE, d MMM');
}

export function fmtBookingDateTime(iso: string, tz: string = viewerTimeZone()): string {
  return format(toZonedTime(iso, tz), "d MMM yyyy 'at' h:mm a");
}
