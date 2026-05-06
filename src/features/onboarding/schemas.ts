import { z } from 'zod';
import { zUUID } from '@/lib/zod-helpers';
import { zUserRole } from '@/features/auth/schemas';

export const STARTUP_STAGES = [
  'ideation',
  'pre_seed',
  'seed',
  'early_growth',
  'pre_a',
  'series_a',
  'pre_b',
  'series_b',
  'late_growth',
] as const;

const optionalString = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .or(z.literal('').transform(() => undefined));

export const zProfileUpdateRequest = z
  .object({
    name: z.string().trim().min(1, 'Name is required').max(200),
    email: z
      .string()
      .trim()
      .email('Enter a valid email')
      .optional()
      .or(z.literal('').transform(() => undefined)),
    organisation: optionalString(200),
    designation: optionalString(200),
    linkedin_url: z
      .string()
      .trim()
      .url('Enter a valid URL')
      .optional()
      .or(z.literal('').transform(() => undefined)),
  })
  .strict();
export type ProfileUpdateRequest = z.infer<typeof zProfileUpdateRequest>;

export const zProfileUpdateResponse = z.object({
  user_id: zUUID,
  name: z.string().nullable(),
  role: zUserRole,
  profile_complete: z.boolean(),
});
export type ProfileUpdateResponse = z.infer<typeof zProfileUpdateResponse>;

export const zLPProfileRequest = z
  .object({
    fund_name: optionalString(200),
    aum_crore: z.number().nonnegative().optional(),
    thesis: optionalString(2000),
    preferred_sectors: z.array(z.string().trim().toLowerCase().min(1)),
    preferred_stages: z.array(z.enum(STARTUP_STAGES)),
    geography: z.array(z.string().trim().min(1)),
    ticket_size_min_cr: z.number().nonnegative().optional(),
    ticket_size_max_cr: z.number().nonnegative().optional(),
    co_invest_interest: z.boolean().optional(),
  })
  .refine(
    (v) =>
      v.ticket_size_min_cr === undefined ||
      v.ticket_size_max_cr === undefined ||
      v.ticket_size_min_cr <= v.ticket_size_max_cr,
    { message: 'Min ticket size must be ≤ max', path: ['ticket_size_max_cr'] },
  );
export type LPProfileRequest = z.infer<typeof zLPProfileRequest>;

export const zLPProfileResponse = z.object({
  user_id: zUUID,
  fund_name: z.string().nullable(),
  profile_complete: z.boolean(),
});
export type LPProfileResponse = z.infer<typeof zLPProfileResponse>;

// PRD §7.2.1 — `POST /onboarding/card-scan`. The wire body accepts either
// the OCR raw text (initial parse) OR the full reviewed contact + category
// (final create-or-update). Backend distinguishes by presence of `parsed`.

export const SCAN_CATEGORIES = ['lp', 'potential_lp', 'vc', 'startup', 'partner'] as const;
export type ScanCategory = (typeof SCAN_CATEGORIES)[number];
export const zScanCategory = z.enum(SCAN_CATEGORIES);

export const zCardScanParsed = z.object({
  name: z.string().nullable(),
  phone: z.string().nullable(),
  email: z.string().nullable(),
  organisation: z.string().nullable(),
  designation: z.string().nullable(),
  linkedin_url: z.string().nullable(),
  website: z.string().nullable().optional(),
  address: z.string().nullable().optional(),
  raw_text: z.string().nullable().optional(),
});
export type CardScanParsed = z.infer<typeof zCardScanParsed>;

export const zCardScanRequest = z.object({
  raw_text: z.string().min(10, 'OCR text must be at least 10 characters'),
  image_url: z.string().url().optional(),
  parsed: zCardScanParsed.partial().optional(),
  category: zScanCategory.optional(),
});
export type CardScanRequest = z.infer<typeof zCardScanRequest>;

export const zCardScanResponse = z.object({
  scan_id: zUUID,
  parsed: zCardScanParsed,
  user_created: z.boolean(),
  user_id: zUUID.nullable(),
});
export type CardScanResponse = z.infer<typeof zCardScanResponse>;

// PRD §7.2.2 — `GET /onboarding/card-scan/{scan_id}`.
export const SCAN_STATUSES = ['pending', 'processed', 'failed'] as const;
export type ScanStatus = (typeof SCAN_STATUSES)[number];
export const zScanStatus = z.enum(SCAN_STATUSES);

export const zCardScanRecord = z.object({
  scan_id: zUUID,
  user_id: zUUID.nullable(),
  image_url: z.string().nullable(),
  ocr_raw: z.string().nullable(),
  extracted_data: zCardScanParsed.nullable(),
  status: zScanStatus,
  created_at: z.string().datetime({ offset: true }),
});
export type CardScanRecord = z.infer<typeof zCardScanRecord>;

// RHF input shape for the contact-review form. Required fields are name +
// phone (highlighted red on submit if empty); the rest are optional. The
// page transforms `phone` to E.164 before submit per §8.12.1.
//
// Optional fields are flat `z.string()` with a refine that treats `''` as
// valid — this keeps the inferred type a flat string and avoids RHF's
// FieldError typing widening that hits any schema with `.transform`.
// The submit handler strips empties before sending.
export const zContactReviewForm = z.object({
  name: z.string().trim().min(1, 'Name is required').max(200),
  phone: z
    .string()
    .trim()
    .min(1, 'Phone is required')
    .refine((v) => /^\+?\d[\d\s\-()]{7,}$/.test(v), { message: 'Enter a valid phone number' }),
  email: z
    .string()
    .trim()
    .max(320)
    .refine((v) => v === '' || /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(v), {
      message: 'Enter a valid email',
    }),
  organisation: z.string().trim().max(200),
  designation: z.string().trim().max(200),
  linkedin_url: z
    .string()
    .trim()
    .max(2000)
    .refine((v) => v === '' || /^https?:\/\//i.test(v), { message: 'Enter a valid URL' }),
  website: z
    .string()
    .trim()
    .max(2000)
    .refine((v) => v === '' || /^https?:\/\//i.test(v), { message: 'Enter a valid URL' }),
  address: z.string().trim().max(500),
  category: zScanCategory,
});
export type ContactReviewForm = z.infer<typeof zContactReviewForm>;
