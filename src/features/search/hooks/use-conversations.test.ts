import { describe, expect, it } from 'vitest';
import { waitFor } from '@testing-library/react';
import { renderHookWithProviders } from '@/test/hook-utils';
import { useConversations } from './use-conversations';
import { useAuthStore } from '@/auth/auth-store';
import {
  queueConversationsError,
  resetConversationMswState,
} from '@/test/msw-fixtures/search-handlers';

function signedInAsLP() {
  useAuthStore.getState().setSession({
    token: 'msw-jwt.test',
    user: {
      id: '00000000-0000-4000-8000-000000000004',
      phone: '+911234567892',
      role: 'lp',
      name: 'LP Test',
      email: null,
      organisation: null,
      profile_complete: true,
    },
    expiresAt: Date.now() + 60 * 60_000,
  });
}

describe('useConversations', () => {
  it('returns the 3 seeded conversations and correct total', async () => {
    signedInAsLP();
    const { result } = renderHookWithProviders(() => useConversations({ limit: 20, offset: 0 }));
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.conversations).toHaveLength(3);
    expect(result.current.data?.total).toBe(3);
    expect(result.current.data?.conversations[0]?.conversation_id).toBe('conv-seed-1');
  });

  it('first conversation has a title', async () => {
    signedInAsLP();
    const { result } = renderHookWithProviders(() => useConversations({ limit: 20, offset: 0 }));
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.conversations[0]?.title).toBe('Fintech startups in India');
  });

  it('second conversation has null title (untitled)', async () => {
    signedInAsLP();
    const { result } = renderHookWithProviders(() => useConversations({ limit: 20, offset: 0 }));
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.conversations[1]?.title).toBeNull();
  });

  it('surfaces a 500 error as isError state', async () => {
    signedInAsLP();
    resetConversationMswState();
    queueConversationsError({ status: 500, code: 'internal_error', message: 'server boom' });
    const { result } = renderHookWithProviders(() => useConversations({ limit: 20, offset: 0 }));
    await waitFor(() => expect(result.current.isError).toBe(true));
  });
});
