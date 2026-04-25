import { useMutation } from '@tanstack/react-query';
import { postPartnerReferral } from '@/api/endpoints';
import type { ApiError } from '@/api/errors';
import type { PartnerReferralRequest, PartnerReferralResponse } from '@/features/admin/schemas';

// PRD §7.12.6 — admin broadcasts a referral request to partners by sector.
// No cache to invalidate; toast surfaces `partners_notified`.
export function usePartnerReferral() {
  return useMutation<PartnerReferralResponse, ApiError, PartnerReferralRequest>({
    mutationFn: (body) => postPartnerReferral(body),
  });
}
