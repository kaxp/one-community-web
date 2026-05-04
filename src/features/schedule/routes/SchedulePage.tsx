import { useRole } from '@/auth/use-auth';
import { AdminCalendarView } from '@/features/schedule/components/AdminCalendarView';
import { ParticipantBookingView } from '@/features/schedule/components/ParticipantBookingView';

// Stage 6 S5 — admins see the read-only calendar; everyone else sees the
// slot-picker and booking flow. Nav item stays roles: ['*'] since both paths
// live under the same route.
export function SchedulePage() {
  const role = useRole();
  if (role === 'admin' || role === 'super_admin') {
    return <AdminCalendarView />;
  }
  return <ParticipantBookingView />;
}
