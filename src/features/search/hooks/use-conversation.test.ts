/**
 * Phase H regression tests: a search conversation must never leak across users
 * on the same browser/tab. Storage is scoped per user and stale state belonging
 * to a different owner is dropped on hydration.
 */
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { renderHookWithProviders } from '@/test/hook-utils';
import { useAuthStore } from '@/auth/auth-store';
import type { UserRole } from '@/types/enums';
import {
  SEARCH_CONVERSATION_KEY_PREFIX,
  clearAllSearchConversations,
  useConversation,
} from './use-conversation';

const USER_A = '00000000-0000-4000-8000-00000000000a';
const USER_B = '00000000-0000-4000-8000-00000000000b';

function signInAs(userId: string, role: UserRole = 'lp') {
  useAuthStore.getState().setSession({
    token: 'msw-jwt.test',
    user: {
      id: userId,
      phone: '+911234567000',
      role,
      name: 'Test',
      email: null,
      organisation: null,
      profile_complete: true,
    },
    expiresAt: Date.now() + 60 * 60_000,
  });
}

function signOut() {
  useAuthStore.getState().clear();
}

function writeRawStorage(userId: string, payload: unknown) {
  window.sessionStorage.setItem(
    `${SEARCH_CONVERSATION_KEY_PREFIX}:${userId}`,
    JSON.stringify(payload),
  );
}

describe('useConversation — per-user storage isolation', () => {
  beforeEach(() => {
    window.sessionStorage.clear();
    signOut();
  });
  afterEach(() => {
    window.sessionStorage.clear();
    signOut();
  });

  it('hydrates state when the stored owner matches the signed-in user', () => {
    writeRawStorage(USER_A, {
      ownerUserId: USER_A,
      conversationId: 'conv-a',
      turns: [
        {
          id: 'turn-1',
          userMessage: 'hi',
          response: {
            conversation_id: 'conv-a',
            turn: 1,
            action: 'search',
            resolved_query: 'hi',
            clarification: null,
            results: [],
            total: 0,
            target_type: 'startup',
          },
        },
      ],
    });
    signInAs(USER_A);

    const { result } = renderHookWithProviders(() => useConversation());
    expect(result.current.conversationId).toBe('conv-a');
    expect(result.current.turns).toHaveLength(1);
  });

  it('drops stored state when the owner does not match the signed-in user', () => {
    writeRawStorage(USER_A, {
      ownerUserId: USER_A,
      conversationId: 'conv-a',
      turns: [
        {
          id: 'turn-1',
          userMessage: 'leaked',
          response: {
            conversation_id: 'conv-a',
            turn: 1,
            action: 'search',
            resolved_query: 'leaked',
            clarification: null,
            results: [],
            total: 0,
            target_type: 'startup',
          },
        },
      ],
    });
    // User B signs in on the same tab. Even though USER_A's payload sits in
    // sessionStorage, the per-user scoping uses a different key so USER_B
    // never sees it.
    signInAs(USER_B);

    const { result } = renderHookWithProviders(() => useConversation());
    expect(result.current.conversationId).toBeNull();
    expect(result.current.turns).toEqual([]);
  });

  it('drops stored state when the payload owner field is forged', () => {
    // Defence-in-depth: even if a manually-edited payload lands under the
    // correct per-user key, the embedded owner mismatch must invalidate it.
    writeRawStorage(USER_B, {
      ownerUserId: USER_A,
      conversationId: 'conv-a',
      turns: [],
    });
    signInAs(USER_B);

    const { result } = renderHookWithProviders(() => useConversation());
    expect(result.current.conversationId).toBeNull();
    expect(result.current.turns).toEqual([]);
  });

  it('clearAllSearchConversations removes every per-user entry', () => {
    writeRawStorage(USER_A, { ownerUserId: USER_A, conversationId: 'a', turns: [] });
    writeRawStorage(USER_B, { ownerUserId: USER_B, conversationId: 'b', turns: [] });
    window.sessionStorage.setItem('unrelated', 'keep me');

    clearAllSearchConversations();

    expect(window.sessionStorage.getItem(`${SEARCH_CONVERSATION_KEY_PREFIX}:${USER_A}`)).toBeNull();
    expect(window.sessionStorage.getItem(`${SEARCH_CONVERSATION_KEY_PREFIX}:${USER_B}`)).toBeNull();
    expect(window.sessionStorage.getItem('unrelated')).toBe('keep me');
  });
});
