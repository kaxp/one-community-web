import { Navigate } from 'react-router-dom';
import { useRole } from '@/auth/use-auth';
import { AdminDashboard } from '@/features/dashboard/components/AdminDashboard';
import { LPDashboard } from '@/features/dashboard/components/LPDashboard';
import { VCDashboard } from '@/features/dashboard/components/VCDashboard';
import { StartupOnboardingDashboard } from '@/features/dashboard/components/StartupOnboardingDashboard';
import { StartupFundedDashboard } from '@/features/dashboard/components/StartupFundedDashboard';
import { PartnerDashboard } from '@/features/dashboard/components/PartnerDashboard';
import { AdvisorDashboard } from '@/features/dashboard/components/AdvisorDashboard';

// Stage 6 S6 — role-specific dashboard replacing the Stage 1 brand smoke-test
// placeholder. Each sub-component owns its own data fetching via existing hooks;
// no new endpoints are required.
export function DashboardPage() {
  const role = useRole();

  switch (role) {
    case 'admin':
    case 'super_admin':
      return <AdminDashboard />;
    case 'lp':
    case 'potential_lp':
      return <LPDashboard />;
    case 'vc':
      return <VCDashboard />;
    case 'startup_inprogress':
    case 'startup_onboarded':
      return <StartupOnboardingDashboard />;
    case 'startup_funded':
      return <StartupFundedDashboard />;
    case 'partner':
      return <PartnerDashboard />;
    case 'advisor':
      return <AdvisorDashboard />;
    default:
      return <Navigate to="/signin" replace />;
  }
}
