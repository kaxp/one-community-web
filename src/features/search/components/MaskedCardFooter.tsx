import { Lock, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { can } from '@/lib/role-capabilities';
import { useRole } from '@/auth/use-auth';

interface Props {
  targetUserId: string;
}

// The escalation panel rendered at the bottom of every masked result card.
// Crunchbase pattern: surface the locked state explicitly and offer two paths
// out — request a connection (in-platform, admin-gated, the canonical
// escalation per decisions.md [P-20]) or upgrade for instant access (the
// monetisation hook — placeholder until the upgrade flow is built).
export function MaskedCardFooter({ targetUserId }: Props) {
  const role = useRole();
  const canRequestConnect = can(role, 'connections.request');

  const onRequestConnect = () => {
    if (!canRequestConnect) {
      toast.error("Your role can't send connection requests yet.");
      return;
    }
    // TODO(stage-3 connections): wire to POST /connections/request with target_id.
    toast.success('Request to connect — coming with the Connections feature in Stage 3.');
  };

  const onUpgrade = () => {
    // TODO(monetisation): launch the partner upgrade flow when the product is ready.
    toast.info('Partner upgrade coming soon — request a connection in the meantime.');
  };

  return (
    <div
      className="mt-1 flex flex-col gap-2 rounded-md border border-brand/20 bg-brand/5 p-3 text-sm"
      data-testid={`masked-footer-${targetUserId}`}
      data-locked="true"
    >
      <div className="flex items-start gap-2">
        <Lock className="mt-0.5 h-4 w-4 text-brand" aria-hidden />
        <p className="text-ink-body">
          <span className="font-semibold text-ink-heading">Connect to unlock.</span> Description,
          traction, ask amount, and AI-rank are visible after the founder accepts your connection
          request.
        </p>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <Button size="sm" onClick={onRequestConnect}>
          Request to connect
        </Button>
        <Button size="sm" variant="outline" onClick={onUpgrade}>
          <Sparkles className="h-3.5 w-3.5" aria-hidden />
          <span>Upgrade for full access</span>
        </Button>
      </div>
    </div>
  );
}
