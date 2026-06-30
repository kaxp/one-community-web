import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { listConversations } from '@/api/endpoints';
import { qk } from '@/api/query-keys';
import type { ConversationListResponse } from '@/features/search/schemas';

interface UseConversationsParams {
  limit: number;
  offset: number;
}

export function useConversations({ limit, offset }: UseConversationsParams) {
  return useQuery<ConversationListResponse>({
    queryKey: qk.search.conversations({ limit, offset }),
    queryFn: () => listConversations({ limit, offset }),
    placeholderData: keepPreviousData,
  });
}
