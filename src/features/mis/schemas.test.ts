import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { buildMISRequest, PERIOD_REGEX, zMISRawData } from './schemas';

describe('MIS schemas', () => {
  describe('zMISRawData strict allowlist', () => {
    it('accepts the 6 allowlisted keys', () => {
      const valid = {
        revenue_inr: '2100000.00',
        burn_inr: '1600000.00',
        headcount: 14,
        runway_months: 7,
        highlights: 'Hired 2 engineers.',
        lowlights: 'Revenue dipped slightly.',
      };
      expect(() => zMISRawData.parse(valid)).not.toThrow();
    });

    it('rejects an extra key not in the allowlist', () => {
      // PRD §7.9.2 — raw_data must be strict. A typo or rogue field is a
      // bug, not a transport concern; .strict() catches it client-side.
      const draft: Record<string, unknown> = {
        revenue_inr: '2100000.00',
        secret_field: 'leak',
      };
      expect(() => zMISRawData.parse(draft)).toThrow(z.ZodError);
    });

    it('rejects a misspelled allowlist key', () => {
      const draft = { revenue_in: '100.00' }; // typo
      expect(() => zMISRawData.parse(draft)).toThrow(z.ZodError);
    });

    it('accepts the empty object (no fields filled)', () => {
      expect(() => zMISRawData.parse({})).not.toThrow();
    });
  });

  describe('PERIOD_REGEX', () => {
    it('matches a valid YYYY-MM', () => {
      expect(PERIOD_REGEX.test('2026-04')).toBe(true);
      expect(PERIOD_REGEX.test('2026-12')).toBe(true);
      expect(PERIOD_REGEX.test('2026-01')).toBe(true);
    });

    it('rejects invalid months', () => {
      expect(PERIOD_REGEX.test('2026-13')).toBe(false);
      expect(PERIOD_REGEX.test('2026-00')).toBe(false);
      expect(PERIOD_REGEX.test('2026-1')).toBe(false);
    });

    it('rejects non-YYYY-MM shapes', () => {
      expect(PERIOD_REGEX.test('26-04')).toBe(false);
      expect(PERIOD_REGEX.test('2026/04')).toBe(false);
      expect(PERIOD_REGEX.test('2026-04-23')).toBe(false);
    });
  });

  describe('buildMISRequest', () => {
    it('builds a request with raw_data INR amounts as Decimal strings', () => {
      // PRD §8.12.1 — INR amounts in raw_data are toFixed(2) Decimal strings.
      const body = buildMISRequest('2026-04', {
        revenue: 2100000,
        burn: 1600000,
        runway_months: 7,
        headcount: 14,
        highlights: 'Hired 2 engineers.',
        lowlights: undefined,
      });
      expect(body.period).toBe('2026-04');
      expect(body.revenue).toBe(2100000);
      expect(body.raw_data).toEqual({
        revenue_inr: '2100000.00',
        burn_inr: '1600000.00',
        headcount: 14,
        runway_months: 7,
        highlights: 'Hired 2 engineers.',
      });
    });

    it('omits raw_data entirely when no fields are filled', () => {
      const body = buildMISRequest('2026-04', {});
      expect(body.raw_data).toBeUndefined();
    });

    it('omits undefined top-level fields from the wire body', () => {
      const body = buildMISRequest('2026-04', {
        revenue: 100,
      });
      expect(body.burn).toBeUndefined();
      expect(body.headcount).toBeUndefined();
      expect(body.highlights).toBeUndefined();
    });
  });
});
