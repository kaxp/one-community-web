import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { EmptyState } from '@/components/empty-state/EmptyState';
import { ErrorState } from '@/components/error-state/ErrorState';
import { OffsetPaginator } from '@/components/pagination/OffsetPaginator';
import { useConversations } from '@/features/search/hooks/use-conversations';
import { relativeFromNow } from '@/lib/date';

const PAGE_SIZE = 20;

export function RecentChats() {
  const [offset, setOffset] = useState(0);
  const { data, isLoading, isError, error, refetch } = useConversations({
    limit: PAGE_SIZE,
    offset,
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Recent conversations</CardTitle>
        <CardDescription>Revisit a past conversation. Read-only.</CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex flex-col gap-3" data-testid="recent-chats-loading">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-14 w-full rounded-lg" />
            ))}
          </div>
        ) : isError ? (
          <ErrorState compact error={error} onRetry={() => void refetch()} />
        ) : data && data.conversations.length === 0 ? (
          <EmptyState
            title="No conversations yet"
            description="Your past searches will show up here."
          />
        ) : data ? (
          <>
            <ul className="flex flex-col divide-y divide-border" data-testid="recent-chats-list">
              {data.conversations.map((conv) => (
                <li key={conv.conversation_id}>
                  <Link
                    to={`/search/conversations/${conv.conversation_id}`}
                    className="flex min-h-[44px] w-full items-center justify-between gap-3 px-1 py-3 hover:bg-surface-muted/60 rounded-md transition-colors"
                    data-testid="recent-chat-row"
                  >
                    <div className="flex min-w-0 flex-col gap-0.5">
                      <span className="truncate text-[15px] font-medium text-ink-heading">
                        {conv.title ?? 'Untitled conversation'}
                      </span>
                      <span className="text-xs text-ink-muted">
                        {relativeFromNow(conv.last_message_at)}
                      </span>
                    </div>
                    <Badge variant="secondary" className="shrink-0 text-xs">
                      {conv.turn_count} {conv.turn_count === 1 ? 'turn' : 'turns'}
                    </Badge>
                  </Link>
                </li>
              ))}
            </ul>
            {data.total > PAGE_SIZE ? (
              <div className="mt-3">
                <OffsetPaginator
                  limit={PAGE_SIZE}
                  offset={offset}
                  itemCount={data.conversations.length}
                  total={data.total}
                  onChange={({ offset: next }) => setOffset(next)}
                />
              </div>
            ) : null}
          </>
        ) : null}
      </CardContent>
    </Card>
  );
}
