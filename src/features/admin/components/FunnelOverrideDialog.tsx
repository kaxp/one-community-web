import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { FUNNEL_LABEL } from '@/features/admin/lib/funnel-labels';
import type { LPFunnelStatus } from '@/features/admin/schemas';

interface Props {
  open: boolean;
  current: LPFunnelStatus | null;
  attempted: LPFunnelStatus | null;
  isPending: boolean;
  onConfirm(): void;
  onClose(): void;
}

// PRD §7.12.5 — 409 surface: backend rejected a forward skip; ask the admin
// to opt into `override=true` and re-PUT.
export function FunnelOverrideDialog({
  open,
  current,
  attempted,
  isPending,
  onConfirm,
  onClose,
}: Props) {
  return (
    <Dialog open={open} onOpenChange={(next) => (!next ? onClose() : undefined)}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Skip funnel stages?</DialogTitle>
          <DialogDescription>
            Moving from{' '}
            <span className="font-medium text-ink-heading">
              {current ? FUNNEL_LABEL[current] : 'Unknown'}
            </span>{' '}
            to{' '}
            <span className="font-medium text-ink-heading">
              {attempted ? FUNNEL_LABEL[attempted] : 'Unknown'}
            </span>{' '}
            skips at least one stage. Confirm with override to proceed.
          </DialogDescription>
        </DialogHeader>
        <p className="rounded-md border border-warning/30 bg-warning/5 p-3 text-xs text-warning">
          Override is logged in the admin audit feed. Auto-actions for the intermediate stages
          (welcome email, follow-up reminder, etc.) will be skipped.
        </p>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isPending}>
            Cancel
          </Button>
          <Button onClick={onConfirm} disabled={isPending} data-testid="funnel-override-confirm">
            {isPending ? 'Overriding…' : 'Enable override & continue'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
