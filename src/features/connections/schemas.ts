import { z } from 'zod';
import { zUUID, zISODateTime, zE164 } from '@/lib/zod-helpers';
import { zUserRole } from '@/features/auth/schemas';

// PRD §7.6.1, §7.6.3, §7.6.4, §7.6.5, §7.7.2 — connections + post-accept feedback.
// Connection status enum is broad (admin queue surfaces all six values via §7.12.2);
// the user-facing endpoints only return a subset, but we keep one enum so cross-page
// caches share types.

export const CONNECTION_STATUSES = [
  'pending_admin',
  'approved',
  'rejected_admin',
  'pending_target',
  'accepted',
  'declined',
] as const;
export type ConnectionStatus = (typeof CONNECTION_STATUSES)[number];
export const zConnectionStatus = z.enum(CONNECTION_STATUSES);

const zCounterpartContact = z
  .object({
    email: z.string().email().nullable().optional(),
    phone: zE164.nullable().optional(),
    linkedin_url: z.string().url().nullable().optional(),
  })
  .strict();
export type CounterpartContact = z.infer<typeof zCounterpartContact>;

const zAcceptedCounterpart = z.object({
  user_id: zUUID,
  name: z.string(),
  role: zUserRole,
  organisation: z.string().nullable().optional(),
  avatar_url: z.string().nullable().optional(),
  contact: zCounterpartContact.nullable().optional(),
});

export const zAcceptedConnection = z.object({
  connection_id: zUUID,
  status: zConnectionStatus,
  counterpart: zAcceptedCounterpart,
  intro_id: zUUID.nullable().optional(),
  feedback_submitted: z.boolean().optional(),
  created_at: zISODateTime,
  responded_at: zISODateTime.nullable(),
});
export type AcceptedConnection = z.infer<typeof zAcceptedConnection>;

export const zAcceptedConnectionsResponse = z.object({
  items: z.array(zAcceptedConnection),
  next_cursor: z.string().nullable(),
});
export type AcceptedConnectionsResponse = z.infer<typeof zAcceptedConnectionsResponse>;

// Pending list — contact is never present (PRD §7.6.5 response field rules).
const zPendingCounterpart = z.object({
  user_id: zUUID,
  name: z.string(),
  role: zUserRole,
  organisation: z.string().nullable().optional(),
  avatar_url: z.string().nullable().optional(),
});

export const PENDING_DIRECTIONS = ['incoming', 'outgoing'] as const;
export type PendingDirection = (typeof PENDING_DIRECTIONS)[number];
export const zPendingDirection = z.enum(PENDING_DIRECTIONS);

export const zPendingConnection = z.object({
  connection_id: zUUID,
  status: zConnectionStatus,
  direction: zPendingDirection,
  counterpart: zPendingCounterpart,
  message: z.string().nullable().optional(),
  created_at: zISODateTime,
  responded_at: zISODateTime.nullable(),
});
export type PendingConnection = z.infer<typeof zPendingConnection>;

export const zPendingConnectionsResponse = z.object({
  items: z.array(zPendingConnection),
  next_cursor: z.string().nullable(),
});
export type PendingConnectionsResponse = z.infer<typeof zPendingConnectionsResponse>;

// PRD §7.6.1 — request connection.
export const zConnectionRequestBody = z.object({
  target_id: zUUID,
  message: z.string().max(200).optional(),
});
export type ConnectionRequestBody = z.infer<typeof zConnectionRequestBody>;

export const zConnectionRequestResponse = z.object({
  connection_id: zUUID,
  status: zConnectionStatus,
});
export type ConnectionRequestResponse = z.infer<typeof zConnectionRequestResponse>;

// PRD §7.6.3 — respond.
export const RESPOND_ACTIONS = ['accept', 'decline'] as const;
export type RespondAction = (typeof RESPOND_ACTIONS)[number];

export const zRespondBody = z.object({
  action: z.enum(RESPOND_ACTIONS),
});
export type RespondBody = z.infer<typeof zRespondBody>;

export const zRespondResponse = z.object({
  connection_id: zUUID,
  status: zConnectionStatus,
  intro_id: zUUID.nullable().optional(),
  responded_at: zISODateTime,
});
export type RespondResponse = z.infer<typeof zRespondResponse>;

// PRD §7.7.2 — feedback.
export const FEEDBACK_RESPONSES = ['yes', 'no'] as const;
export type FeedbackResponseValue = (typeof FEEDBACK_RESPONSES)[number];

export const zFeedbackBody = z.object({
  intro_id: zUUID,
  response: z.enum(FEEDBACK_RESPONSES),
});
export type FeedbackBody = z.infer<typeof zFeedbackBody>;

export const zFeedbackResponse = z.object({
  recorded: z.boolean(),
  intro_id: zUUID,
  response: z.enum(FEEDBACK_RESPONSES),
});
export type FeedbackResponse = z.infer<typeof zFeedbackResponse>;

// Form schema for the Request-to-Connect dialog (200-char optional message).
export const zRequestConnectForm = z.object({
  message: z.string().max(200, 'Keep it under 200 characters').optional(),
});
export type RequestConnectForm = z.infer<typeof zRequestConnectForm>;
