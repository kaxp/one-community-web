import { useCallback, useEffect, useRef, useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { searchConversation } from '@/api/endpoints';
import type { ApiError } from '@/api/errors';
import type { ConversationResponse, SearchTargetType } from '@/features/search/schemas';

// One turn = one user message + the assistant's reply for that message.
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

// sessionStorage key. One per tab; survives navigation within the tab but
// clears automatically on tab close, matching ChatGPT/Cosmic-style "thread
// for this session" semantics.
const STORAGE_KEY = 'wv:search:conversation';

interface StoredConversation {
  conversationId: string | null;
  turns: ConversationTurn[];
}

function loadFromSession(): StoredConversation {
  if (typeof window === 'undefined') return { conversationId: null, turns: [] };
  try {
    const raw = window.sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return { conversationId: null, turns: [] };
    const parsed = JSON.parse(raw) as Partial<StoredConversation>;
    if (typeof parsed !== 'object' || parsed === null) {
      return { conversationId: null, turns: [] };
    }
    const conversationId = typeof parsed.conversationId === 'string' ? parsed.conversationId : null;
    const turns = Array.isArray(parsed.turns) ? (parsed.turns as ConversationTurn[]) : [];
    return { conversationId, turns };
  } catch {
    return { conversationId: null, turns: [] };
  }
}

function saveToSession(state: StoredConversation): void {
  if (typeof window === 'undefined') return;
  try {
    window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Storage quota or disabled; non-fatal.
  }
}

function clearSession(): void {
  if (typeof window === 'undefined') return;
  try {
    window.sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    // non-fatal
  }
}

/**
 * Owns the per-tab conversation state. Hydrates from sessionStorage on mount
 * so navigation away from /search (e.g. to a startup detail page) and back
 * preserves the thread. The thread clears on:
 *   - Tab close (sessionStorage auto-clears)
 *   - Explicit "New chat" button (reset())
 *   - 24h server-side TTL on the Redis-backed conversation
 *
 * The mutation appends to `turns` on success. On error we don't append the
 * turn (the user message is shown live in the UI by the consumer, so they
 * can retry without losing context).
 */
export function useConversation(opts: UseConversationOptions = {}): UseConversationApi {
  // Hydrate from sessionStorage on initial render.
  const initialRef = useRef<StoredConversation | null>(null);
  if (initialRef.current === null) {
    initialRef.current = loadFromSession();
  }
  const [conversationId, setConversationId] = useState<string | null>(
    initialRef.current.conversationId,
  );
  const [turns, setTurns] = useState<ConversationTurn[]>(initialRef.current.turns);

  // Persist any state change. Skipping the very first effect run would be
  // cleaner, but writing back the hydrated state is harmless (same bytes).
  useEffect(() => {
    saveToSession({ conversationId, turns });
  }, [conversationId, turns]);

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
          id: `${response.conversation_id}-${response.turn}-${prev.length}`,
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
    clearSession();
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
