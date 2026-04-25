import { useState } from 'react';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ErrorState } from '@/components/error-state/ErrorState';
import { useQuarterlyReportApprove } from '@/features/admin/hooks/use-quarterly-report-approve';
import type { QuarterlyReport } from '@/features/admin/schemas';
import type { ApiError } from '@/api/errors';

interface Props {
  report: QuarterlyReport | null;
  onClose(): void;
}

// PRD §7.12.8 UI flow #1 — confirm dialog warns about distribution before
// firing the approve mutation. 409 → row already approved (refetch).
export function QuarterlyReportApproveDialog({ report, onClose }: Props) {
  const approve = useQuarterlyReportApprove();
  const [conflictMsg, setConflictMsg] = useState<string | null>(null);

  const open = report !== null;

  const onConfirm = () => {
    if (!report) return;
    setConflictMsg(null);
    approve.mutate(
      { report_id: report.report_id },
      {
        onSuccess: () => {
          toast.success('Approved — distribution queued.');
          onClose();
        },
        onError: (err: ApiError) => {
          if (err.code === 'conflict') {
            setConflictMsg(err.userMessage);
            return;
          }
          if (err.code !== 'validation_error') {
            toast.error(err.userMessage);
          }
        },
      },
    );
  };

  return (
    <Dialog open={open} onOpenChange={(next) => (!next ? onClose() : undefined)}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Approve {report?.quarter} report?</DialogTitle>
          <DialogDescription>
            This queues distribution to all LPs ({report?.recipient_count ?? 'TBD'} recipients). You
            cannot undo this once the worker fires.
          </DialogDescription>
        </DialogHeader>
        {conflictMsg ? (
          <p className="rounded-md border border-warning/30 bg-warning/5 p-3 text-xs text-warning">
            {conflictMsg}
          </p>
        ) : null}
        {approve.isError && approve.error?.code !== 'conflict' ? (
          <ErrorState error={approve.error} compact />
        ) : null}
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={approve.isPending}>
            Cancel
          </Button>
          <Button onClick={onConfirm} disabled={approve.isPending}>
            {approve.isPending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                <span>Approving…</span>
              </>
            ) : (
              'Approve & distribute'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
