import { describe, expect, it } from 'vitest';
import {
  zTravelPlan,
  zTravelPlansResponse,
  zTravelPlanCreateRequest,
  zTripForm,
  zHomeCityForm,
} from './schemas';

describe('travel schemas', () => {
  it('parses a valid travel plan', () => {
    const plan = zTravelPlan.parse({
      id: 'f6a7b8c9-0d1e-4f3a-8b5c-6d7e8f9a0b1c',
      user_id: '0f3c0b0a-e6cc-4f1c-9a2e-a5b2e3f1c9d0',
      destination_city: 'Bengaluru',
      travel_start: '2026-05-10',
      travel_end: '2026-05-12',
      purpose: 'Investor meetings',
      status: 'active',
      alerts_sent: false,
    });
    expect(plan.status).toBe('active');
    expect(plan.alerts_sent).toBe(false);
  });

  it('accepts an empty plans array', () => {
    expect(zTravelPlansResponse.parse([])).toEqual([]);
  });

  it('accepts plan without purpose (null)', () => {
    const plan = zTravelPlan.parse({
      id: 'f6a7b8c9-0d1e-4f3a-8b5c-6d7e8f9a0b1c',
      user_id: '0f3c0b0a-e6cc-4f1c-9a2e-a5b2e3f1c9d0',
      destination_city: 'Mumbai',
      travel_start: '2026-06-01',
      travel_end: '2026-06-01',
      purpose: null,
      status: 'cancelled',
      alerts_sent: true,
    });
    expect(plan.purpose).toBeNull();
  });

  it('rejects bad date format', () => {
    expect(() =>
      zTravelPlanCreateRequest.parse({
        destination_city: 'Pune',
        travel_start: '10/05/2026',
        travel_end: '2026-05-12',
      }),
    ).toThrow();
  });

  it('zTripForm rejects end-before-start', () => {
    const result = zTripForm.safeParse({
      destination_city: 'Bengaluru',
      travel_start: '2026-05-12',
      travel_end: '2026-05-10',
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.path).toEqual(['travel_end']);
    }
  });

  it('zTripForm allows same-day start/end', () => {
    const result = zTripForm.safeParse({
      destination_city: 'Bengaluru',
      travel_start: '2026-05-10',
      travel_end: '2026-05-10',
    });
    expect(result.success).toBe(true);
  });

  it('zTripForm coerces empty purpose to undefined', () => {
    const result = zTripForm.parse({
      destination_city: 'Bengaluru',
      travel_start: '2026-05-10',
      travel_end: '2026-05-12',
      purpose: '   ',
    });
    expect(result.purpose).toBeUndefined();
  });

  it('zTripForm rejects 600-char purpose', () => {
    const result = zTripForm.safeParse({
      destination_city: 'Bengaluru',
      travel_start: '2026-05-10',
      travel_end: '2026-05-12',
      purpose: 'x'.repeat(600),
    });
    expect(result.success).toBe(false);
  });

  it('zTripForm trims destination_city', () => {
    const result = zTripForm.parse({
      destination_city: '  Bengaluru  ',
      travel_start: '2026-05-10',
      travel_end: '2026-05-12',
    });
    expect(result.destination_city).toBe('Bengaluru');
  });

  it('zHomeCityForm rejects blank input', () => {
    const result = zHomeCityForm.safeParse({ home_city: '   ' });
    expect(result.success).toBe(false);
  });

  it('zHomeCityForm trims to canonical', () => {
    const result = zHomeCityForm.parse({ home_city: '  Mumbai  ' });
    expect(result.home_city).toBe('Mumbai');
  });
});
