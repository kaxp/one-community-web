import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { getAdminInfoRequests, patchAdminInfoRequest, postInfoRequest } from '@/api/endpoints';
import { qk } from '@/api/query-keys';
import type { ApiError } from '@/api/errors';
import type { InfoRequestsResponse } from '@/features/admin/schemas';

export function useRequestInfo() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: { startup_id: string; message?: string }) => postInfoRequest(body),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: qk.investor.startupsAll });
    },
  });
}

export function useAdminInfoRequests(status?: string) {
  return useQuery<InfoRequestsResponse, ApiError>({
    queryKey: qk.admin.infoRequests(status),
    queryFn: () => getAdminInfoRequests(status !== undefined ? { status } : {}),
    staleTime: 30_000,
  });
}

export function useAdminInfoRequestAction() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      body,
    }: {
      id: string;
      body: { action: 'approve' | 'reject'; note?: string };
    }) => patchAdminInfoRequest(id, body),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: qk.admin.infoRequestsAll });
    },
  });
}
