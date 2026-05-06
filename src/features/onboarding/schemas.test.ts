import { describe, expect, it } from 'vitest';
import {
  zCardScanParsed,
  zCardScanRequest,
  zCardScanResponse,
  zContactReviewForm,
  zScanCategory,
} from './schemas';

describe('onboarding card-scan schemas', () => {
  it('zCardScanRequest rejects raw_text shorter than 10 chars', () => {
    const result = zCardScanRequest.safeParse({ raw_text: 'short' });
    expect(result.success).toBe(false);
  });

  it('zCardScanRequest accepts raw_text only (initial parse phase)', () => {
    const result = zCardScanRequest.safeParse({
      raw_text: 'Kapil Sahu\nPrincipal, Warmup Ventures\n+91-9876543210',
    });
    expect(result.success).toBe(true);
  });

  it('zCardScanRequest accepts parsed + category (confirm phase)', () => {
    const result = zCardScanRequest.parse({
      raw_text: 'Kapil Sahu\nPrincipal, Warmup Ventures\n+91-9876543210',
      parsed: {
        name: 'Kapil',
        phone: '+919876543210',
        email: null,
        organisation: 'Warmup',
        designation: null,
        linkedin_url: null,
      },
      category: 'lp',
    });
    expect(result.category).toBe('lp');
  });

  it('zCardScanResponse parses the user-created success shape', () => {
    const row = zCardScanResponse.parse({
      scan_id: '1a2b3c4d-5e6f-4a8b-9c0d-1e2f3a4b5c6d',
      parsed: {
        name: 'Kapil',
        phone: '+919876543210',
        email: 'kapil@example.com',
        organisation: 'Warmup',
        designation: 'Principal',
        linkedin_url: null,
      },
      user_created: true,
      user_id: '0f3c0b0a-e6cc-4f1c-9a2e-a5b2e3f1c9d0',
    });
    expect(row.user_created).toBe(true);
    expect(row.user_id).toBeTruthy();
  });

  it('zCardScanParsed accepts all-null fields (low-confidence parse)', () => {
    const row = zCardScanParsed.parse({
      name: null,
      phone: null,
      email: null,
      organisation: null,
      designation: null,
      linkedin_url: null,
    });
    expect(row.name).toBeNull();
  });

  it('zScanCategory rejects unknown values', () => {
    expect(zScanCategory.safeParse('mentor').success).toBe(false);
    expect(zScanCategory.safeParse('lp').success).toBe(true);
  });

  it('zContactReviewForm requires name + phone', () => {
    const result = zContactReviewForm.safeParse({
      name: '',
      phone: '',
      email: '',
      organisation: '',
      designation: '',
      linkedin_url: '',
      category: 'lp',
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      const paths = result.error.issues.map((i) => i.path.join('.'));
      expect(paths).toContain('name');
      expect(paths).toContain('phone');
    }
  });

  it('zContactReviewForm accepts blank optional fields', () => {
    const result = zContactReviewForm.safeParse({
      name: 'Kapil',
      phone: '+919876543210',
      email: '',
      organisation: '',
      designation: '',
      linkedin_url: '',
      website: '',
      address: '',
      category: 'vc',
    });
    expect(result.success).toBe(true);
  });

  it('zContactReviewForm rejects bad email / linkedin URL when non-empty', () => {
    const bad = zContactReviewForm.safeParse({
      name: 'Kapil',
      phone: '+919876543210',
      email: 'not-an-email',
      organisation: '',
      designation: '',
      linkedin_url: 'not-a-url',
      category: 'vc',
    });
    expect(bad.success).toBe(false);
  });
});
