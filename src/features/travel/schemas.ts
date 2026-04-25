import { z } from 'zod';
import { zUUID, zISODate } from '@/lib/zod-helpers';

// PRD §7.11 — travel plans + home city.

export const TRAVEL_STATUSES = ['active', 'cancelled'] as const;
export type TravelStatus = (typeof TRAVEL_STATUSES)[number];
export const zTravelStatus = z.enum(TRAVEL_STATUSES);

// PRD §7.11.1 + §7.11.2 — travel plan row.
export const zTravelPlan = z.object({
  id: zUUID,
  user_id: zUUID,
  destination_city: z.string(),
  travel_start: zISODate,
  travel_end: zISODate,
  purpose: z.string().nullable().optional(),
  status: zTravelStatus,
  alerts_sent: z.boolean(),
});
export type TravelPlan = z.infer<typeof zTravelPlan>;

// PRD §7.11.2 — `GET /travel/plans` returns `data: TravelPlan[]` directly.
export const zTravelPlansResponse = z.array(zTravelPlan);
export type TravelPlansResponse = z.infer<typeof zTravelPlansResponse>;

// PRD §7.11.1 — wire body. Server enforces travel_end >= travel_start; the
// form schema also rejects client-side via .refine on the form-level shape.
export const zTravelPlanCreateRequest = z.object({
  destination_city: z.string().min(1).max(200),
  travel_start: zISODate,
  travel_end: zISODate,
  purpose: z.string().max(500).optional(),
});
export type TravelPlanCreateRequest = z.infer<typeof zTravelPlanCreateRequest>;

// PRD §7.11.3 — cancel response is just `{ id, status }`.
export const zTravelPlanCancelResponse = z.object({
  id: zUUID,
  status: zTravelStatus,
});
export type TravelPlanCancelResponse = z.infer<typeof zTravelPlanCancelResponse>;

// PRD §7.11.4 — home city.
export const zHomeCityRequest = z.object({
  home_city: z.string().min(1).max(200),
});
export type HomeCityRequest = z.infer<typeof zHomeCityRequest>;

export const zHomeCityResponse = z.object({
  user_id: zUUID,
  home_city: z.string(),
});
export type HomeCityResponse = z.infer<typeof zHomeCityResponse>;

// RHF input for the "Add trip" ExecutionDialog. Trims city strings, coerces
// empty `purpose` to undefined (so the wire body simply omits it), and
// validates travel_end >= travel_start client-side per PRD §7.11.1.
export const zTripForm = z
  .object({
    destination_city: z.string().trim().min(1, 'Required').max(200),
    travel_start: zISODate,
    travel_end: zISODate,
    purpose: z
      .string()
      .trim()
      .max(500, 'Max 500 characters')
      .optional()
      .transform((v) => (v === '' || v === undefined ? undefined : v)),
  })
  .refine((v) => v.travel_end >= v.travel_start, {
    message: 'End date must be on or after start date',
    path: ['travel_end'],
  });
export type TripForm = z.infer<typeof zTripForm>;

// RHF input for the "Update home city" ExecutionPanel.
export const zHomeCityForm = z.object({
  home_city: z.string().trim().min(1, 'Required').max(200),
});
export type HomeCityForm = z.infer<typeof zHomeCityForm>;
