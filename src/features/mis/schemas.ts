import { z } from 'zod';
import { zUUID, zISODateTime } from '@/lib/zod-helpers';

// PRD §7.9 — MIS redesign (decisions.md [P-23], 2026-04-27).
//
// MIS is now a **file upload** (Excel / Tally / CSV / PDF) — not a structured
// JSON form. Financial operating metrics (revenue, burn, runway) have moved to
// the pitch profile (src/features/pitch/schemas.ts).
//
// This file defines:
//   - MIS GET response (current period + last submission info)
//   - MIS file upload form (FileDropzone + period + optional comment)
//   - MIS upload response
//   - MIS history item

export const PERIOD_REGEX = /^\d{4}-(0[1-9]|1[0-2])$/;
export const zPeriod = z.string().regex(PERIOD_REGEX, 'Expected YYYY-MM');

export const MAX_MIS_FILE_BYTES = 20 * 1024 * 1024; // 20 MB

export const ALLOWED_MIS_MIME_TYPES = new Set([
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'text/csv',
  'application/pdf',
  'application/octet-stream',
]);

// ── GET /portfolio/mis response ─────────────────────────────────────────────

export const zMISLastSubmission = z.object({
  submission_id: zUUID,
  period: zPeriod,
  file_url: z.string().nullable().optional(),
  file_name: z.string().nullable().optional(),
  comment: z.string().nullable().optional(),
  submitted_at: zISODateTime,
});
export type MISLastSubmission = z.infer<typeof zMISLastSubmission>;

export const zMISFormResponse = z.object({
  company_name: z.string(),
  current_period: zPeriod,
  last_submission: zMISLastSubmission.nullable(),
});
export type MISFormResponse = z.infer<typeof zMISFormResponse>;

// ── POST /portfolio/mis file upload ─────────────────────────────────────────

// React Hook Form input shape for the upload form.
export const zMISUploadInput = z.object({
  period: zPeriod,
  comment: z.string().trim().max(2000).optional(),
  // `file` is not in the Zod schema (File objects aren't JSON-serialisable).
  // Validate it separately using `ALLOWED_MIS_MIME_TYPES` + `MAX_MIS_FILE_BYTES`.
});
export type MISUploadInput = z.infer<typeof zMISUploadInput>;

export const zMISUploadResponse = z.object({
  submission_id: zUUID,
  period: zPeriod,
  startup_id: zUUID,
  file_url: z.string(),
  file_name: z.string(),
  submitted_at: zISODateTime,
});
export type MISUploadResponse = z.infer<typeof zMISUploadResponse>;

// ── GET /portfolio/mis/history ───────────────────────────────────────────────

export const zMISHistoryItem = z.object({
  submission_id: zUUID,
  period: zPeriod,
  file_url: z.string().nullable().optional(),
  file_name: z.string().nullable().optional(),
  comment: z.string().nullable().optional(),
  submitted_at: zISODateTime.nullable().optional(),
});
export type MISHistoryItem = z.infer<typeof zMISHistoryItem>;

export const zMISHistoryResponse = z.object({
  items: z.array(zMISHistoryItem),
});
export type MISHistoryResponse = z.infer<typeof zMISHistoryResponse>;

// ── Helpers ──────────────────────────────────────────────────────────────────

/** Validate a File before appending to FormData. Returns an error string or null. */
export function validateMISFile(file: File): string | null {
  if (file.size > MAX_MIS_FILE_BYTES) {
    return `File is too large (${Math.round(file.size / 1024)} KB). Max 20 MB.`;
  }
  const mime = file.type || 'application/octet-stream';
  if (!ALLOWED_MIS_MIME_TYPES.has(mime)) {
    return `Unsupported file type "${mime}". Upload an Excel, CSV, or PDF MIS report.`;
  }
  return null;
}

/** Build a FormData from the upload form and file. */
export function buildMISFormData(input: MISUploadInput, file: File): FormData {
  const fd = new FormData();
  fd.append('file', file, file.name);
  fd.append('period', input.period);
  if (input.comment) fd.append('comment', input.comment);
  return fd;
}
