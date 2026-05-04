import { z } from 'zod';
import { zUUID, zISODateTime, zISODate } from '@/lib/zod-helpers';
import { zUserRole } from '@/features/auth/schemas';

// PRD §7.10 — schedule (slots / book / bookings / cancel). Backend returns
// IST (+05:30) timestamps; the UI converts to the viewer's local TZ for
// display (PRD §8.12.2).

// PRD §7.10.1 — `GET /schedule/slots` returns `data: Slot[]` (array IS the
// payload, not wrapped in `{ items }`). Empty array is a valid "no slots".
export const zSlot = z.object({
  start: zISODateTime,
  end: zISODateTime,
  date: zISODate,
});
export type Slot = z.infer<typeof zSlot>;

export const zSlotsResponse = z.array(zSlot);
export type SlotsResponse = z.infer<typeof zSlotsResponse>;

export const BOOKING_STATUSES = ['pending', 'confirmed', 'cancelled'] as const;
export type BookingStatus = (typeof BOOKING_STATUSES)[number];
export const zBookingStatus = z.enum(BOOKING_STATUSES);

export const BOOKING_DIRECTIONS = ['outgoing', 'incoming'] as const;
export type BookingDirection = (typeof BOOKING_DIRECTIONS)[number];
export const zBookingDirection = z.enum(BOOKING_DIRECTIONS);

const zBookingCounterpart = z.object({
  user_id: zUUID,
  name: z.string(),
  role: zUserRole,
  organisation: z.string().nullable().optional(),
});
export type BookingCounterpart = z.infer<typeof zBookingCounterpart>;

// PRD §7.10.3 — bookings list row.
export const zBooking = z.object({
  booking_id: zUUID,
  scheduled_at: zISODateTime,
  duration_minutes: z.number().int(),
  status: zBookingStatus,
  direction: zBookingDirection,
  counterpart: zBookingCounterpart,
  purpose: z.string().nullable().optional(),
  calendar_event_id: z.string().nullable().optional(),
});
export type Booking = z.infer<typeof zBooking>;

export const zBookingsResponse = z.object({
  items: z.array(zBooking),
  next_cursor: z.string().nullable(),
});
export type BookingsResponse = z.infer<typeof zBookingsResponse>;

// PRD §7.10.2 — book request. duration_minutes strictly 30 or 60.
export const DURATION_OPTIONS = [30, 60] as const;
export type DurationMinutes = (typeof DURATION_OPTIONS)[number];

const zDuration = z
  .number()
  .int()
  .refine((v) => v === 30 || v === 60, { message: 'Choose 30 or 60 minutes' });

export const zBookRequest = z.object({
  target_id: zUUID,
  scheduled_at: zISODateTime,
  duration_minutes: zDuration,
  purpose: z.string().max(500).optional(),
});
export type BookRequest = z.infer<typeof zBookRequest>;

export const zBookResponse = z.object({
  booking_id: zUUID,
  calendar_event_id: z.string().nullable().optional(),
  scheduled_at: zISODateTime,
  duration_minutes: z.number().int(),
  status: zBookingStatus,
  target_id: zUUID,
  requester_id: zUUID,
});
export type BookResponse = z.infer<typeof zBookResponse>;

// PRD §7.10.4 — cancel response.
export const zCancelResponse = z.object({
  booking_id: zUUID,
  status: zBookingStatus,
  cancelled_at: zISODateTime,
});
export type CancelResponse = z.infer<typeof zCancelResponse>;

// Phase 7 / Stage 6 Session 5 — admin calendar.
const zCalendarParty = z
  .object({
    user_id: zUUID,
    name: z.string(),
    email: z.string().nullable().optional(),
    role: z.string().nullable().optional(),
  })
  .passthrough();
export type CalendarParty = z.infer<typeof zCalendarParty>;

export const zAdminCalendarItem = z
  .object({
    booking_id: zUUID,
    scheduled_at: zISODateTime,
    duration_minutes: z.number().nullable(),
    status: z.string().nullable(),
    calendar_event_id: z.string().nullable(),
    notes: z.string().nullable(),
    requester: zCalendarParty,
    target: zCalendarParty,
  })
  .passthrough();
export type AdminCalendarItem = z.infer<typeof zAdminCalendarItem>;

export const zAdminCalendarResponse = z
  .object({
    items: z.array(zAdminCalendarItem),
    next_cursor: z.null(),
  })
  .passthrough();
export type AdminCalendarResponse = z.infer<typeof zAdminCalendarResponse>;

// RHF input shape used by the booking ExecutionDialog. `scheduled_at` is
// pre-populated from the clicked slot's `start` (already ISO with TZ); the
// user only edits target_id / duration / purpose. The textarea returns ''
// when empty — coerce to undefined so the wire body simply omits `purpose`.
export const zBookForm = z.object({
  target_id: zUUID,
  scheduled_at: zISODateTime,
  duration_minutes: zDuration,
  purpose: z
    .string()
    .trim()
    .max(500)
    .optional()
    .transform((v) => (v === '' || v === undefined ? undefined : v)),
});
export type BookForm = z.infer<typeof zBookForm>;
