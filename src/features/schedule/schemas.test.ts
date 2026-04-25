import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { zBookForm, zBookRequest, zSlot, zSlotsResponse } from './schemas';

describe('schedule schemas', () => {
  describe('zSlot / zSlotsResponse', () => {
    it('accepts an IST-encoded 30-min slot', () => {
      expect(() =>
        zSlot.parse({
          start: '2026-04-26T10:00:00+05:30',
          end: '2026-04-26T10:30:00+05:30',
          date: '2026-04-26',
        }),
      ).not.toThrow();
    });

    it('rejects a slot whose timestamp lacks a timezone', () => {
      expect(() =>
        zSlot.parse({
          start: '2026-04-26T10:00:00',
          end: '2026-04-26T10:30:00',
          date: '2026-04-26',
        }),
      ).toThrow(z.ZodError);
    });

    it('accepts the empty array (no available slots)', () => {
      expect(() => zSlotsResponse.parse([])).not.toThrow();
    });
  });

  describe('zBookRequest duration_minutes', () => {
    const baseSlot = {
      target_id: '11111111-1111-4000-8000-000000000010',
      scheduled_at: '2026-04-26T10:00:00+05:30',
    };

    it('accepts 30', () => {
      expect(() =>
        zBookRequest.parse({ ...baseSlot, duration_minutes: 30, purpose: 'hi' }),
      ).not.toThrow();
    });

    it('accepts 60', () => {
      expect(() => zBookRequest.parse({ ...baseSlot, duration_minutes: 60 })).not.toThrow();
    });

    it('rejects 45 (any duration other than 30 or 60)', () => {
      expect(() => zBookRequest.parse({ ...baseSlot, duration_minutes: 45 })).toThrow(z.ZodError);
    });

    it('rejects a 600-char purpose (max 500)', () => {
      expect(() =>
        zBookRequest.parse({
          ...baseSlot,
          duration_minutes: 30,
          purpose: 'x'.repeat(600),
        }),
      ).toThrow(z.ZodError);
    });
  });

  describe('zBookForm', () => {
    it('coerces an empty string purpose to undefined (RHF default)', () => {
      const parsed = zBookForm.parse({
        target_id: '11111111-1111-4000-8000-000000000010',
        scheduled_at: '2026-04-26T10:00:00+05:30',
        duration_minutes: 30,
        purpose: '',
      });
      expect(parsed.purpose).toBeUndefined();
    });
  });
});
