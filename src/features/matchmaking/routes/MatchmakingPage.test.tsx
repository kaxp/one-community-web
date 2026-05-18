import { describe, expect, it } from 'vitest';
import { Route, Routes } from 'react-router-dom';
import { renderWithProviders, screen, waitFor, within } from '@/test/test-utils';
import { MatchmakingPage } from './MatchmakingPage';
import { useAuthStore } from '@/auth/auth-store';
import {
  queueMatchmakingListError,
  setMswMatchmakingFixture,
} from '@/test/msw-fixtures/matchmaking-handlers';

function signedInAsLP() {
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

function renderPage() {
  return renderWithProviders(
    <Routes>
      <Route path="/matchmaking" element={<MatchmakingPage />} />
    </Routes>,
    { route: '/matchmaking' },
  );
}

describe('MatchmakingPage', () => {
  it('renders three suggestion cards from the seeded fixture', async () => {
    signedInAsLP();
    renderPage();

    await waitFor(() => expect(screen.getByTestId('suggestions-grid')).toBeInTheDocument());
    const grid = screen.getByTestId('suggestions-grid');
    expect(within(grid).getByText(/Acme Technologies/)).toBeInTheDocument();
    expect(within(grid).getByText(/Boltline Robotics/)).toBeInTheDocument();
    expect(within(grid).getByText(/Cresta Health/)).toBeInTheDocument();
    // Score badges render the qualitative label (fmtScore: ≥0.75 → 'Strong match').
    expect(within(grid).getByText(/Strong match/)).toBeInTheDocument();
  });

  it('shows an empty state when there are no suggestions', async () => {
    signedInAsLP();
    setMswMatchmakingFixture([]);
    renderPage();

    await waitFor(() => expect(screen.getByText(/No opportunities yet/i)).toBeInTheDocument());
    expect(screen.getByText(/personalised opportunities/i)).toBeInTheDocument();
  });

  it('renders ErrorState when the list fetch fails', async () => {
    signedInAsLP();
    queueMatchmakingListError({ status: 500, code: 'internal_error', message: 'boom' });
    renderPage();

    await waitFor(() => expect(screen.getByText(/code: internal_error/i)).toBeInTheDocument());
  });
});
