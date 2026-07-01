import { Link, useParams } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { ErrorState } from '@/components/error-state/ErrorState';
import { ReadOnlyTurn } from '@/features/search/components/ReadOnlyTurn';
import { useConversationDetail } from '@/features/search/hooks/use-conversation-detail';

export function SearchConversationPage() {
  const { id } = useParams<{ id: string }>();
  const { data, isLoading, isError, error, refetch } = useConversationDetail(id);

  return (
    <div className="flex flex-col gap-6 pb-10">
      <h1 className="sr-only">Conversation</h1>

      <Button variant="ghost" size="sm" className="self-start" asChild>
        <Link to="/search">
          <ArrowLeft className="h-4 w-4" aria-hidden />
          Back to search
        </Link>
      </Button>

      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-4">
        <h2 className="truncate text-xl font-semibold text-ink-heading">
          {data ? (data.title ?? 'Untitled conversation') : null}
        </h2>
        <Badge variant="secondary" className="shrink-0">
          Read-only
        </Badge>
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="flex flex-col gap-6" data-testid="conversation-loading">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="flex flex-col gap-3">
              <div className="flex justify-end">
                <Skeleton className="h-10 w-3/4 rounded-2xl" />
              </div>
              <Skeleton className="h-24 w-full rounded-md" />
            </div>
          ))}
        </div>
      ) : isError ? (
        <ErrorState error={error} onRetry={() => void refetch()} />
      ) : data ? (
        <div className="flex flex-col gap-6" data-testid="conversation-turns">
          {data.turns.map((t) => (
            <ReadOnlyTurn
              key={t.turn}
              userMessage={t.user_message}
              answerMarkdown={t.answer_markdown}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}
