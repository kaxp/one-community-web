import { z } from 'zod';

export const zUUID = z.string().uuid();
export const zISODateTime = z.string().datetime({ offset: true });
export const zISODate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
export const zE164 = z.string().regex(/^\+[1-9]\d{6,14}$/);

// Cheap, sync UUID v1-5 validator. Use for client-side gating BEFORE we send a
// non-UUID up to the wire (issues.md [I-21] surfaced this when an admin
// pasted a non-UUID into the LP funnel direct-id input and the response
// failed Zod parse with `Invalid uuid` — a confusing 500-toast surface).
const UUID_REGEX =
  /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-5][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$/;
export function isUuid(value: string | null | undefined): boolean {
  if (!value) return false;
  return UUID_REGEX.test(value.trim());
}

export function zEnvelope<T extends z.ZodTypeAny>(schema: T) {
  return z.object({
    data: schema.nullable(),
    error: z
      .object({
        code: z.string(),
        message: z.string(),
        detail: z.unknown().optional(),
      })
      .nullable(),
    pagination: z
      .object({
        limit: z.number().int(),
        offset: z.number().int(),
      })
      .optional(),
  });
}

export function zPaginated<T extends z.ZodTypeAny>(itemSchema: T) {
  return z.object({
    items: z.array(itemSchema),
    next_cursor: z.string().nullable(),
  });
}
