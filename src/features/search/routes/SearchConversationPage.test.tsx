import { describe, expect, it, vi } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import { Route, Routes } from 'react-router-dom';
import { renderWithProviders } from '@/test/test-utils';
import { SearchConversationPage } from './SearchConversationPage';
import { useAuthStore } from '@/auth/auth-store';
import {
  queueConversationDetailError,
  resetConversationMswState,
} from '@/test/msw-fixtures/search-handlers';

// ProseAnswerBlock uses react-markdown + remark-gfm; those libs render fine in
// JSDOM for simple content but this mock keeps the test deterministic and fast.
vi.mock('@/features/search/components/ProseAnswerBlock', () => ({
  ProseAnswerBlock: ({ markdown }: { markdown: string }) => (
    <div data-testid="prose-answer-block">{markdown}</div>
  ),
}));

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

function renderAtConversationRoute(id: string) {
  return renderWithProviders(
    <Routes>
      <Route path="/search/conversations/:id" element={<SearchConversationPage />} />
    </Routes>,
    { route: `/search/conversations/${id}` },
  );
}

describe('SearchConversationPage', () => {
  it('renders both seeded turns including user messages', async () => {
    signedInAsLP();
    resetConversationMswState();
    renderAtConversationRoute('abc');

    await waitFor(() => expect(screen.getByTestId('conversation-turns')).toBeInTheDocument());

    // First turn user message
    expect(screen.getByText('Show me fintech startups')).toBeInTheDocument();
    // Second turn user message
    expect(screen.getByText('Tell me more about Acme Fin')).toBeInTheDocument();
    // Answer rendered via mocked ProseAnswerBlock
    const proseBlocks = screen.getAllByTestId('prose-answer-block');
    expect(proseBlocks.length).toBe(2);
    expect(proseBlocks[0]).toHaveTextContent('Acme Fin');
  });

  it('shows the read-only label in the header', async () => {
    signedInAsLP();
    resetConversationMswState();
    renderAtConversationRoute('abc');

    await waitFor(() => expect(screen.getByText(/read-only/i)).toBeInTheDocument());
  });

  it('shows back-to-search link', async () => {
    signedInAsLP();
    resetConversationMswState();
    renderAtConversationRoute('abc');

    await waitFor(() =>
      expect(screen.getByRole('link', { name: /back to search/i })).toBeInTheDocument(),
    );
  });

  it('renders ErrorState on not_found', async () => {
    signedInAsLP();
    resetConversationMswState();
    queueConversationDetailError({
      status: 404,
      code: 'not_found',
      message: 'Conversation not found',
    });
    renderAtConversationRoute('unknown-id');

    await waitFor(() => expect(screen.getByRole('alert')).toBeInTheDocument());
    // ErrorState surfaces the error code
    expect(screen.getByText(/not_found/i)).toBeInTheDocument();
  });
});
