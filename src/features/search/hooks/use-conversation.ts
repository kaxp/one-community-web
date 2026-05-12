import { useCallback, useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { searchConversation } from '@/api/endpoints';
import type { ApiError } from '@/api/errors';
import type { ConversationResponse, SearchTargetType } from '@/features/search/schemas';

// One turn = one user message + the assistant's reply for that message.
// We hold the full ConversationResponse so renderers can decide whether to
// show the synthesised answer block, the card grid, a clarification, or a
// "no match" text — exactly like the single-shot search page does today.
export interface ConversationTurn {
  id: string; // local-only client id for React keys
  userMessage: string;
  response: ConversationResponse;
}

interface UseConversationOptions {
  targetType?: SearchTargetType | null;
  limit?: number;
}

interface UseConversationApi {
  conversationId: string | null;
  turns: ConversationTurn[];
  isPending: boolean;
  error: ApiError | null;
  submit: (message: string) => void;
  reset: () => void; // "New chat" — clears state, server-side conv expires on its own
}

/**
 * Owns the per-page conversation state. The conversation_id lives in
 * component state (not localStorage) because each visit to /search is a
 * fresh thread by design — refresh = new chat. This matches the WhatsApp
 * pattern too: a new session is a new conversation.
 *
 * The mutation appends to `turns` on success. On error we keep the user
 * bubble in the thread but skip the assistant turn so the user can retry
 * without losing context.
 */
export function useConversation(opts: UseConversationOptions = {}): UseConversationApi {
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [turns, setTurns] = useState<ConversationTurn[]>([]);

  const mutation = useMutation<ConversationResponse, ApiError, string>({
    mutationFn: (message) =>
      searchConversation({
        conversation_id: conversationId,
        message,
        target_type: opts.targetType ?? null,
        limit: opts.limit,
      }),
    onSuccess: (response, message) => {
      setConversationId(response.conversation_id);
      setTurns((prev) => [
        ...prev,
        {
          id: `${response.conversation_id}-${response.turn}`,
          userMessage: message,
          response,
        },
      ]);
    },
  });

  const submit = useCallback(
    (message: string) => {
      const trimmed = message.trim();
      if (!trimmed) return;
      mutation.mutate(trimmed);
    },
    [mutation],
  );

  const reset = useCallback(() => {
    setConversationId(null);
    setTurns([]);
    mutation.reset();
  }, [mutation]);

  return {
    conversationId,
    turns,
    isPending: mutation.isPending,
    error: mutation.error,
    submit,
    reset,
  };
}
