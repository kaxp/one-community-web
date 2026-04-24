import { describe, expect, it } from 'vitest';
import { isValidE164, toE164 } from './phone';

describe('phone utilities', () => {
  it('validates canonical E.164 numbers', () => {
    expect(isValidE164('+911234567890')).toBe(true);
    expect(isValidE164('+14155552671')).toBe(true);
  });

  it('rejects obviously wrong strings', () => {
    expect(isValidE164('1234567890')).toBe(false);
    expect(isValidE164('+0123456')).toBe(false);
  });

  it('prefixes bare Indian numbers with +91', () => {
    expect(toE164('9876543210')).toBe('+919876543210');
    expect(toE164('+919876543210')).toBe('+919876543210');
  });
});
