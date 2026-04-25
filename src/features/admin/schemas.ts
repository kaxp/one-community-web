import { z } from 'zod';
import { zUUID, zISODateTime } from '@/lib/zod-helpers';
import { zUserRole } from '@/features/auth/schemas';

export const ADMIN_CONNECTION_STATUSES = [
  'pending_admin',
  'approved',
  'rejected_admin',
  'pending_target',
  'accepted',
  'declined',
] as const;
export type AdminConnectionStatus = (typeof ADMIN_CONNECTION_STATUSES)[number];
export const zAdminConnectionStatus = z.enum(ADMIN_CONNECTION_STATUSES);

export const ADMIN_TAB_STATUSES = [
  'pending_admin',
  'pending_target',
  'accepted',
  'declined',
] as const;
export type AdminTabStatus = (typeof ADMIN_TAB_STATUSES)[number];

const zPartyRef = z.object({
  user_id: zUUID,
  name: z.string(),
  role: zUserRole,
  organisation: z.string().nullable().optional(),
});
export type AdminConnectionParty = z.infer<typeof zPartyRef>;

export const zAdminConnection = z.object({
  connection_id: zUUID,
  status: zAdminConnectionStatus,
  requester: zPartyRef,
  target: zPartyRef,
  message: z.string().nullable().optional(),
  created_at: zISODateTime,
  responded_at: zISODateTime.nullable(),
});
export type AdminConnection = z.infer<typeof zAdminConnection>;

export const zAdminConnectionsResponse = z.object({
  items: z.array(zAdminConnection),
  next_cursor: z.string().nullable(),
});
export type AdminConnectionsResponse = z.infer<typeof zAdminConnectionsResponse>;

export const zAdminActionRequest = z.object({
  action: z.enum(['approve', 'reject']),
  note: z.string().optional(),
});
export type AdminActionRequest = z.infer<typeof zAdminActionRequest>;

export const zAdminActionResponse = z.object({
  connection_id: zUUID,
  status: zAdminConnectionStatus,
  admin_id: zUUID,
  acted_at: zISODateTime,
});
export type AdminActionResponse = z.infer<typeof zAdminActionResponse>;
