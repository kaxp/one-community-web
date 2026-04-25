import { z } from 'zod';
import { zUUID } from '@/lib/zod-helpers';

export const zLoggableInteractionType = z.enum([
  'search_view',
  'search_click',
  'profile_view',
  'meeting_booked',
]);
export type LoggableInteractionType = z.infer<typeof zLoggableInteractionType>;

export const zInteractionLogRequest = z.object({
  target_id: zUUID,
  interaction_type: zLoggableInteractionType,
  target_type: z.enum(['lp', 'startup']).optional(),
  source: z.string().optional(),
  metadata: z.record(z.unknown()).optional(),
});
export type InteractionLogRequest = z.infer<typeof zInteractionLogRequest>;

export const zInteractionLogResponse = z.object({
  logged: z.boolean(),
  deduped: z.boolean(),
});
export type InteractionLogResponse = z.infer<typeof zInteractionLogResponse>;
