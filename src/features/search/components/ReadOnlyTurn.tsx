import { ProseAnswerBlock } from '@/features/search/components/ProseAnswerBlock';

interface Props {
  userMessage: string;
  answerMarkdown: string | null;
}

/**
 * A single read-only conversation turn.
 * Markup is identical to the preloaded-turn block in SearchPage so it can be
 * reused in both the WA-continuity section and SearchConversationPage.
 */
export function ReadOnlyTurn({ userMessage, answerMarkdown }: Props) {
  return (
    <div className="flex flex-col gap-3">
      <div className="flex justify-end">
        <div className="max-w-[85%] rounded-2xl bg-brand/10 px-4 py-2 text-[15px] text-ink-heading">
          {userMessage}
        </div>
      </div>
      {answerMarkdown ? <ProseAnswerBlock markdown={answerMarkdown} /> : null}
    </div>
  );
}
