import { describe, expect, it } from 'vitest';
import { waitFor, renderHook } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { useFeedback } from './use-feedback';
import { useAuthStore } from '@/auth/auth-store';
import { queueFeedbackError } from '@/test/msw-fixtures/connections-handlers';

function signedIn() {
  useAuthStore.getState().setSession({
    token: 'msw-jwt.test',
    user: {
      id: '00000000-0000-4000-8000-000000000004',
      phone: '+911234567892',
      role: 'lp',
      name: 'LP',
      email: null,
      organisation: null,
      profile_complete: true,
    },
    expiresAt: Date.now() + 60 * 60_000,
  });
}

function makeWrapper() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
  }
  return Wrapper;
}

const INTRO_ID = 'cc33dd44-ee55-4000-8000-001122334455';

describe('useFeedback', () => {
  it('records yes feedback', async () => {
    signedIn();
    const { result } = renderHook(() => useFeedback(), { wrapper: makeWrapper() });
    result.current.mutate({ intro_id: INTRO_ID, response: 'yes' });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.recorded).toBe(true);
    expect(result.current.data?.response).toBe('yes');
  });

  it('surfaces 409 conflict via ApiError', async () => {
    signedIn();
    queueFeedbackError({ status: 409, code: 'conflict', message: 'already done' });
    const { result } = renderHook(() => useFeedback(), { wrapper: makeWrapper() });
    result.current.mutate({ intro_id: INTRO_ID, response: 'no' });
    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error?.code).toBe('conflict');
  });
});
