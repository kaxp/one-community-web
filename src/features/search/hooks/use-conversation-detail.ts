import { useQuery } from '@tanstack/react-query';
import { getConversationDetail } from '@/api/endpoints';
import { qk } from '@/api/query-keys';
import type { ConversationDetailResponse } from '@/features/search/schemas';

export function useConversationDetail(id: string | undefined) {
  return useQuery<ConversationDetailResponse>({
    queryKey: qk.search.conversationDetail(id ?? ''),
    queryFn: () => getConversationDetail(id!),
    enabled: !!id,
  });
}
