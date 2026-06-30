import { Link, useParams } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { ErrorState } from '@/components/error-state/ErrorState';
import { ReadOnlyTurn } from '@/features/search/components/ReadOnlyTurn';
import { useConversationDetail } from '@/features/search/hooks/use-conversation-detail';

export function SearchConversationPage() {
  const { id } = useParams<{ id: string }>();
  const { data, isLoading, isError, error, refetch } = useConversationDetail(id);

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-6 pb-10">
      <h1 className="sr-only">Conversation</h1>

      {/* Header row */}
      <div className="flex flex-wrap items-center gap-3">
        <Button variant="outline" size="sm" asChild>
          <Link to="/search">
            <ArrowLeft className="mr-1 h-4 w-4" aria-hidden />
            Back to search
          </Link>
        </Button>
        {data ? (
          <span className="truncate text-base font-semibold text-ink-heading">
            {data.title ?? 'Untitled conversation'}
          </span>
        ) : null}
        <span className="ml-auto text-xs text-ink-muted">Read-only</span>
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
