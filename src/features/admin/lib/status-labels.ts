import type { AdminConnectionStatus, AdminTabStatus } from '@/features/admin/schemas';

export const STATUS_LABEL: Record<AdminConnectionStatus, string> = {
  pending_admin: 'Pending admin',
  approved: 'Approved',
  rejected_admin: 'Rejected',
  pending_target: 'Pending target',
  accepted: 'Accepted',
  declined: 'Declined',
};

export const TAB_LABEL: Record<AdminTabStatus, string> = {
  pending_admin: 'Pending admin',
  pending_target: 'Pending target',
  accepted: 'Accepted',
  declined: 'Declined',
};

export function statusBadgeVariant(
  status: AdminConnectionStatus,
): 'success' | 'warning' | 'error' | 'secondary' {
  switch (status) {
    case 'accepted':
    case 'approved':
      return 'success';
    case 'pending_admin':
    case 'pending_target':
      return 'warning';
    case 'rejected_admin':
    case 'declined':
      return 'error';
    default:
      return 'secondary';
  }
}
