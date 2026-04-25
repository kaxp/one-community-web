import { useMutation, useQueryClient } from '@tanstack/react-query';
import { postQuarterlyReportApprove } from '@/api/endpoints';
import { qk } from '@/api/query-keys';
import type { ApiError } from '@/api/errors';
import type {
  QuarterlyReportApproveRequest,
  QuarterlyReportApproveResponse,
} from '@/features/admin/schemas';

// PRD §7.12.8 — approve quarterly report. Invalidates the list so the row
// flips to "approved, distributing…" + bumps admin summary's recent feed
// (audit log includes the approve_quarterly_report action).
export function useQuarterlyReportApprove() {
  const qc = useQueryClient();
  return useMutation<QuarterlyReportApproveResponse, ApiError, QuarterlyReportApproveRequest>({
    mutationFn: (body) => postQuarterlyReportApprove(body),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: qk.admin.quarterlyReportsAll });
      void qc.invalidateQueries({ queryKey: qk.admin.summary });
    },
  });
}
