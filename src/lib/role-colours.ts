import type { UserRole } from '@/types/enums';

export function roleColour(role: UserRole): { bg: string; text: string; label: string } {
  switch (role) {
    case 'admin':
    case 'super_admin':
      return { bg: 'bg-brand/10', text: 'text-brand', label: 'Admin' };
    case 'lp':
      return { bg: 'bg-success/10', text: 'text-success', label: 'LP' };
    case 'potential_lp':
      return { bg: 'bg-warning/10', text: 'text-warning', label: 'Potential LP' };
    case 'vc':
      return { bg: 'bg-brand/10', text: 'text-brand', label: 'VC' };
    case 'startup_inprogress':
    case 'startup_onboarded':
    case 'startup_funded':
      return { bg: 'bg-brand/10', text: 'text-brand', label: 'Startup' };
    case 'partner':
      return { bg: 'bg-muted', text: 'text-ink-body', label: 'Partner' };
    case 'advisor':
      return { bg: 'bg-muted', text: 'text-ink-body', label: 'Advisor' };
    default:
      return { bg: 'bg-muted', text: 'text-ink-body', label: role };
  }
}
