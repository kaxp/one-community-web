import { z } from 'zod';

export const zUUID = z.string().uuid();
export const zISODateTime = z.string().datetime({ offset: true });
export const zISODate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
export const zE164 = z.string().regex(/^\+[1-9]\d{6,14}$/);

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
