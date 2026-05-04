import { http, HttpResponse, type HttpHandler } from 'msw';
import type { AdminCalendarItem, Booking, Slot } from '@/features/schedule/schemas';

// PRD §7.10 fixtures. Slots are emitted in IST (+05:30) per backend
// convention. The book handler removes the booked slot from the in-memory
// pool and adds a row to bookings, so a follow-up booking on the same slot
// surfaces 409 deterministically.

type ErrorEnvelope = { status: number; code: string; message: string; detail?: unknown };

const REQUESTER_ID = '00000000-0000-4000-8000-000000000004';
const SEED_TARGET_ID = '11111111-1111-4000-8000-000000000010';

function makeSlot(date: string, hh: number, mm: number): Slot {
  const startMinutes = mm;
  const endHH = mm + 30 >= 60 ? hh + 1 : hh;
  const endMM = (mm + 30) % 60;
  const pad = (n: number) => n.toString().padStart(2, '0');
  return {
    date,
    start: `${date}T${pad(hh)}:${pad(startMinutes)}:00+05:30`,
    end: `${date}T${pad(endHH)}:${pad(endMM)}:00+05:30`,
  };
}

function futureDateStr(offsetDays: number): string {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  return d.toISOString().slice(0, 10);
}
// Always 2 / 3 days ahead so the isPast guard in SlotGrid never disables them.
export const SEED_DATE_A = futureDateStr(2);
export const SEED_DATE_B = futureDateStr(3);

const SEED_SLOTS: Slot[] = [
  makeSlot(SEED_DATE_A, 10, 0),
  makeSlot(SEED_DATE_A, 10, 30),
  makeSlot(SEED_DATE_A, 11, 0),
  makeSlot(SEED_DATE_B, 10, 0),
  makeSlot(SEED_DATE_B, 14, 0),
];

const SEED_BOOKINGS: Booking[] = [
  {
    booking_id: 'e5f6a7b8-9c0d-4e2f-8a4b-5c6d7e8f9a01',
    scheduled_at: '2026-04-25T10:00:00+05:30',
    duration_minutes: 30,
    status: 'confirmed',
    direction: 'outgoing',
    counterpart: {
      user_id: SEED_TARGET_ID,
      name: 'Priya Rao',
      role: 'vc',
      organisation: 'NeoVC',
    },
    purpose: 'Exploratory chat about compliance thesis',
    calendar_event_id: 'ev_abc1@google.com',
  },
];

// Stage 6 S5 — admin calendar seed: 5 meetings across 3 days.
const TODAY = '2026-05-04';
const ADMIN_CALENDAR_SEED: AdminCalendarItem[] = [
  {
    booking_id: '00000000-0000-4000-8000-000000000c01',
    scheduled_at: `${TODAY}T10:00:00+05:30`,
    duration_minutes: 30,
    status: 'confirmed',
    calendar_event_id: 'ev_cal1@google.com',
    notes: null,
    requester: {
      user_id: '00000000-0000-4000-8000-000000000004',
      name: 'Arjun LP',
      email: null,
      role: 'lp',
    },
    target: {
      user_id: '00000000-0000-4000-8000-000000000005',
      name: 'Priya VC',
      email: null,
      role: 'vc',
    },
  },
  {
    booking_id: '00000000-0000-4000-8000-000000000c02',
    scheduled_at: `${TODAY}T14:00:00+05:30`,
    duration_minutes: 60,
    status: 'confirmed',
    calendar_event_id: null,
    notes: null,
    requester: {
      user_id: '00000000-0000-4000-8000-000000000006',
      name: 'Ravi LP',
      email: null,
      role: 'lp',
    },
    target: {
      user_id: '00000000-0000-4000-8000-000000000007',
      name: 'Startup Co',
      email: null,
      role: 'startup_funded',
    },
  },
  {
    booking_id: '00000000-0000-4000-8000-000000000c03',
    scheduled_at: `2026-05-05T11:00:00+05:30`,
    duration_minutes: 30,
    status: 'pending',
    calendar_event_id: null,
    notes: 'Follow-up call',
    requester: {
      user_id: '00000000-0000-4000-8000-000000000008',
      name: 'Meera VC',
      email: null,
      role: 'vc',
    },
    target: {
      user_id: '00000000-0000-4000-8000-000000000009',
      name: 'Raj LP',
      email: null,
      role: 'lp',
    },
  },
  {
    booking_id: '00000000-0000-4000-8000-000000000c04',
    scheduled_at: `2026-05-06T09:30:00+05:30`,
    duration_minutes: 30,
    status: 'confirmed',
    calendar_event_id: 'ev_cal4@google.com',
    notes: null,
    requester: {
      user_id: '00000000-0000-4000-8000-000000000010',
      name: 'Anjali LP',
      email: null,
      role: 'lp',
    },
    target: {
      user_id: '00000000-0000-4000-8000-000000000011',
      name: 'NovaTech',
      email: null,
      role: 'startup_funded',
    },
  },
  {
    booking_id: '00000000-0000-4000-8000-000000000c05',
    scheduled_at: `2026-05-06T16:00:00+05:30`,
    duration_minutes: 60,
    status: 'confirmed',
    calendar_event_id: 'ev_cal5@google.com',
    notes: null,
    requester: {
      user_id: '00000000-0000-4000-8000-000000000012',
      name: 'Kiran VC',
      email: null,
      role: 'vc',
    },
    target: {
      user_id: '00000000-0000-4000-8000-000000000013',
      name: 'LP Fund',
      email: null,
      role: 'potential_lp',
    },
  },
];

let slotsFixture: Slot[] = [];
let bookingsFixture: Booking[] = [];
let nextSlotsError: ErrorEnvelope | null = null;
let nextBookError: ErrorEnvelope | null = null;
let nextBookingsError: ErrorEnvelope | null = null;
let nextCancelError: ErrorEnvelope | null = null;
let nextAdminCalendarError: ErrorEnvelope | null = null;
let bookCounter = 0;

export function resetMswScheduleState() {
  slotsFixture = SEED_SLOTS.map((s) => ({ ...s }));
  bookingsFixture = SEED_BOOKINGS.map((b) => ({ ...b, counterpart: { ...b.counterpart } }));
  nextSlotsError = null;
  nextBookError = null;
  nextBookingsError = null;
  nextCancelError = null;
  nextAdminCalendarError = null;
  bookCounter = 0;
}

export function queueAdminCalendarError(err: ErrorEnvelope) {
  nextAdminCalendarError = err;
}

resetMswScheduleState();

export function setMswSlotsFixture(next: Slot[]) {
  slotsFixture = next.map((s) => ({ ...s }));
}

export function setMswBookingsFixture(next: Booking[]) {
  bookingsFixture = next.map((b) => ({ ...b, counterpart: { ...b.counterpart } }));
}

export function queueSlotsError(err: ErrorEnvelope) {
  nextSlotsError = err;
}

export function queueBookError(err: ErrorEnvelope) {
  nextBookError = err;
}

export function queueBookingsError(err: ErrorEnvelope) {
  nextBookingsError = err;
}

export function queueCancelError(err: ErrorEnvelope) {
  nextCancelError = err;
}

export function getMswScheduleSlotsCount() {
  return slotsFixture.length;
}

export function getMswScheduleBookings() {
  return bookingsFixture.slice();
}

function errorBody(err: ErrorEnvelope) {
  return {
    data: null,
    error: {
      code: err.code,
      message: err.message,
      ...(err.detail !== undefined ? { detail: err.detail } : {}),
    },
  };
}

export const adminScheduleHandlers: HttpHandler[] = [
  http.get('*/api/v1/admin/schedule/calendar', () => {
    if (nextAdminCalendarError) {
      const err = nextAdminCalendarError;
      nextAdminCalendarError = null;
      return HttpResponse.json(errorBody(err), { status: err.status });
    }
    return HttpResponse.json({
      data: { items: ADMIN_CALENDAR_SEED, next_cursor: null },
      error: null,
    });
  }),
];

export const scheduleHandlers: HttpHandler[] = [
  // PRD §7.10.1 — slots (filtered by from_date / days when present, else
  // returned in full).
  http.get('*/api/v1/schedule/slots', ({ request }) => {
    if (nextSlotsError) {
      const err = nextSlotsError;
      nextSlotsError = null;
      return HttpResponse.json(errorBody(err), { status: err.status });
    }
    const url = new URL(request.url);
    const fromDate = url.searchParams.get('from_date');
    const daysParam = url.searchParams.get('days');
    let out = slotsFixture.slice();
    if (fromDate) {
      out = out.filter((s) => s.date >= fromDate);
    }
    if (daysParam) {
      const days = Math.max(1, Math.min(30, Number.parseInt(daysParam, 10) || 7));
      if (fromDate) {
        const end = new Date(`${fromDate}T00:00:00`);
        end.setDate(end.getDate() + days - 1);
        const endKey = end.toISOString().slice(0, 10);
        out = out.filter((s) => s.date <= endKey);
      }
    }
    return HttpResponse.json({ data: out, error: null });
  }),

  // PRD §7.10.2 — book. Removes the slot from the pool and pushes a booking.
  http.post('*/api/v1/schedule/book', async ({ request }) => {
    if (nextBookError) {
      const err = nextBookError;
      nextBookError = null;
      return HttpResponse.json(errorBody(err), { status: err.status });
    }
    const body = (await request.json()) as {
      target_id?: string;
      scheduled_at?: string;
      duration_minutes?: number;
      purpose?: string;
    };
    const slotIdx = slotsFixture.findIndex((s) => s.start === body.scheduled_at);
    if (slotIdx === -1) {
      return HttpResponse.json(
        errorBody({
          status: 409,
          code: 'conflict',
          message: 'Target is not available at this time',
          detail: { scheduled_at: body.scheduled_at },
        }),
        { status: 409 },
      );
    }
    slotsFixture.splice(slotIdx, 1);
    bookCounter += 1;
    const booking: Booking = {
      booking_id: `e5f6a7b8-9c0d-4e2f-8a4b-5c6d7e8f9a${bookCounter
        .toString(16)
        .padStart(2, '0')
        .slice(-2)}`,
      scheduled_at: body.scheduled_at!,
      duration_minutes: body.duration_minutes ?? 30,
      status: 'confirmed',
      direction: 'outgoing',
      counterpart: {
        user_id: body.target_id ?? SEED_TARGET_ID,
        name: 'Booked Counterpart',
        role: 'lp',
        organisation: 'Fixture Fund',
      },
      purpose: body.purpose ?? null,
      calendar_event_id: `ev_${bookCounter}@google.com`,
    };
    bookingsFixture.unshift(booking);
    return HttpResponse.json({
      data: {
        booking_id: booking.booking_id,
        calendar_event_id: booking.calendar_event_id,
        scheduled_at: booking.scheduled_at,
        duration_minutes: booking.duration_minutes,
        status: 'confirmed',
        target_id: body.target_id ?? SEED_TARGET_ID,
        requester_id: REQUESTER_ID,
      },
      error: null,
    });
  }),

  // PRD §7.10.3 — bookings list (cursor-paginated; fixture returns all rows
  // in one page).
  http.get('*/api/v1/schedule/bookings', () => {
    if (nextBookingsError) {
      const err = nextBookingsError;
      nextBookingsError = null;
      return HttpResponse.json(errorBody(err), { status: err.status });
    }
    return HttpResponse.json({
      data: { items: bookingsFixture.slice(), next_cursor: null },
      error: null,
    });
  }),

  // PRD §7.10.4 — cancel.
  http.delete('*/api/v1/schedule/book/:id', ({ params }) => {
    if (nextCancelError) {
      const err = nextCancelError;
      nextCancelError = null;
      return HttpResponse.json(errorBody(err), { status: err.status });
    }
    const id = String(params.id);
    const idx = bookingsFixture.findIndex((b) => b.booking_id === id);
    if (idx === -1) {
      return HttpResponse.json(
        errorBody({ status: 404, code: 'not_found', message: 'Booking not found' }),
        { status: 404 },
      );
    }
    const row = bookingsFixture[idx]!;
    if (row.status === 'cancelled') {
      return HttpResponse.json(
        errorBody({
          status: 409,
          code: 'conflict',
          message: 'Booking already cancelled',
          detail: { status: 'cancelled' },
        }),
        { status: 409 },
      );
    }
    const cancelledAt = '2026-04-23T16:00:00.000Z';
    bookingsFixture[idx] = { ...row, status: 'cancelled' };
    // issues.md [I-17] — restore the slot to the pool so the calendar shows it
    // free again. We reconstruct end-time from `duration_minutes` since the
    // booking row doesn't carry the original slot.end.
    const start = new Date(row.scheduled_at);
    const end = new Date(start.getTime() + row.duration_minutes * 60_000);
    const isoOffset = row.scheduled_at.match(/(Z|[+-]\d{2}:?\d{2})$/)?.[0] ?? 'Z';
    const fmt = (d: Date) => {
      const pad = (n: number) => n.toString().padStart(2, '0');
      // Normalise back to "YYYY-MM-DDTHH:mm:ss<offset>" against the original tz
      // so equality checks in the book handler keep working for re-booking.
      const yyyy = d.getUTCFullYear();
      const mm = pad(d.getUTCMonth() + 1);
      const dd = pad(d.getUTCDate());
      const hh = pad(d.getUTCHours());
      const mi = pad(d.getUTCMinutes());
      const ss = pad(d.getUTCSeconds());
      return `${yyyy}-${mm}-${dd}T${hh}:${mi}:${ss}${isoOffset}`;
    };
    if (!slotsFixture.find((s) => s.start === row.scheduled_at)) {
      slotsFixture.push({
        date: row.scheduled_at.slice(0, 10),
        start: row.scheduled_at,
        end: fmt(end),
      });
      slotsFixture.sort((a, b) => a.start.localeCompare(b.start));
    }
    return HttpResponse.json({
      data: {
        booking_id: id,
        status: 'cancelled' as const,
        cancelled_at: cancelledAt,
      },
      error: null,
    });
  }),
];
