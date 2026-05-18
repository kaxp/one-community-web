import { useCallback, useEffect, useRef, useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { searchConversation } from '@/api/endpoints';
import type { ApiError } from '@/api/errors';
import { useUser } from '@/auth/use-auth';
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

// sessionStorage key prefix. The full key is `${PREFIX}:${userId}` so each
// signed-in account gets an isolated thread. Without per-user scoping a
// stale conversation from User A would be rendered for User B on the same
// browser (the FE leak we shipped Phase H to fix).
export const SEARCH_CONVERSATION_KEY_PREFIX = 'wv:search:conversation';

function storageKeyFor(userId: string | null | undefined): string | null {
  if (!userId) return null;
  return `${SEARCH_CONVERSATION_KEY_PREFIX}:${userId}`;
}

interface StoredConversation {
  ownerUserId: string;
  conversationId: string | null;
  turns: ConversationTurn[];
}

function loadFromSession(userId: string | null): StoredConversation | null {
  if (typeof window === 'undefined') return null;
  const key = storageKeyFor(userId);
  if (!key) return null;
  try {
    const raw = window.sessionStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<StoredConversation>;
    if (typeof parsed !== 'object' || parsed === null) return null;
    // Defence-in-depth: the key already scopes by user, but verify the
    // payload-embedded owner matches before trusting it. Drops state if
    // anything looks off.
    if (typeof parsed.ownerUserId !== 'string' || parsed.ownerUserId !== userId) {
      return null;
    }
    const conversationId = typeof parsed.conversationId === 'string' ? parsed.conversationId : null;
    const turns = Array.isArray(parsed.turns) ? (parsed.turns as ConversationTurn[]) : [];
    return { ownerUserId: userId, conversationId, turns };
  } catch {
    return null;
  }
}

function saveToSession(state: StoredConversation): void {
  if (typeof window === 'undefined') return;
  const key = storageKeyFor(state.ownerUserId);
  if (!key) return;
  try {
    window.sessionStorage.setItem(key, JSON.stringify(state));
  } catch {
    // Storage quota or disabled; non-fatal.
  }
}

function clearSession(userId: string | null): void {
  if (typeof window === 'undefined') return;
  const key = storageKeyFor(userId);
  if (!key) return;
  try {
    window.sessionStorage.removeItem(key);
  } catch {
    // non-fatal
  }
}

/**
 * Remove every search-conversation sessionStorage entry across all users.
 * Wire this into the logout handler so a follow-on user on the same tab
 * never inherits a previous user's thread.
 */
export function clearAllSearchConversations(): void {
  if (typeof window === 'undefined') return;
  try {
    const toRemove: string[] = [];
    for (let i = 0; i < window.sessionStorage.length; i += 1) {
      const k = window.sessionStorage.key(i);
      if (k && k.startsWith(`${SEARCH_CONVERSATION_KEY_PREFIX}:`)) {
        toRemove.push(k);
      }
    }
    toRemove.forEach((k) => window.sessionStorage.removeItem(k));
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
  const user = useUser();
  const userId = user?.id ?? null;

  // Hydrate from sessionStorage on initial render. Only restores state if
  // the persisted owner matches the currently-signed-in user; anything
  // else starts a fresh thread.
  const initialRef = useRef<StoredConversation | null>(null);
  const hydratedForRef = useRef<string | null>(null);
  if (initialRef.current === null && hydratedForRef.current === null) {
    initialRef.current = loadFromSession(userId);
    hydratedForRef.current = userId;
  }
  const [conversationId, setConversationId] = useState<string | null>(
    initialRef.current?.conversationId ?? null,
  );
  const [turns, setTurns] = useState<ConversationTurn[]>(initialRef.current?.turns ?? []);

  // If the signed-in user changes mid-mount (e.g. account switch without a
  // full reload), drop any state from the prior owner instead of leaking it.
  useEffect(() => {
    if (hydratedForRef.current !== null && hydratedForRef.current !== userId) {
      setConversationId(null);
      setTurns([]);
      hydratedForRef.current = userId;
    }
  }, [userId]);

  // Persist any state change. Skipped when there's no signed-in user (no
  // safe scope to write under) or when the thread is empty (nothing worth
  // persisting yet — keeps the storage clean).
  useEffect(() => {
    if (!userId) return;
    if (conversationId === null && turns.length === 0) return;
    saveToSession({ ownerUserId: userId, conversationId, turns });
  }, [userId, conversationId, turns]);

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
    clearSession(userId);
  }, [mutation, userId]);

  return {
    conversationId,
    turns,
    isPending: mutation.isPending,
    error: mutation.error,
    submit,
    reset,
  };
}
