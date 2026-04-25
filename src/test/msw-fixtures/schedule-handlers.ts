import { http, HttpResponse, type HttpHandler } from 'msw';
import type { Booking, Slot } from '@/features/schedule/schemas';

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

const SEED_DATE_A = '2026-04-26';
const SEED_DATE_B = '2026-04-27';

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

let slotsFixture: Slot[] = [];
let bookingsFixture: Booking[] = [];
let nextSlotsError: ErrorEnvelope | null = null;
let nextBookError: ErrorEnvelope | null = null;
let nextBookingsError: ErrorEnvelope | null = null;
let nextCancelError: ErrorEnvelope | null = null;
let bookCounter = 0;

export function resetMswScheduleState() {
  slotsFixture = SEED_SLOTS.map((s) => ({ ...s }));
  bookingsFixture = SEED_BOOKINGS.map((b) => ({ ...b, counterpart: { ...b.counterpart } }));
  nextSlotsError = null;
  nextBookError = null;
  nextBookingsError = null;
  nextCancelError = null;
  bookCounter = 0;
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
