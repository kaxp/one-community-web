import { describe, expect, it, vi } from 'vitest';
import { Route, Routes } from 'react-router-dom';
import userEvent from '@testing-library/user-event';
import { renderWithProviders, screen, waitFor, within } from '@/test/test-utils';
import { MatchmakingPage } from './MatchmakingPage';
import { useAuthStore } from '@/auth/auth-store';
import {
  queueMatchmakingListError,
  setMswConnectionAlwaysCreates,
  setMswMatchmakingFixture,
} from '@/test/msw-fixtures/matchmaking-handlers';
import { toast } from 'sonner';

vi.mock('sonner', async () => {
  const actual = await vi.importActual<typeof import('sonner')>('sonner');
  return {
    ...actual,
    toast: {
      ...actual.toast,
      success: vi.fn(),
      error: vi.fn(),
    },
  };
});

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

    await waitFor(() => expect(screen.getByText(/No suggestions this week/i)).toBeInTheDocument());
    expect(screen.getByText(/Check back on Monday/i)).toBeInTheDocument();
  });

  it('renders ErrorState when the list fetch fails', async () => {
    signedInAsLP();
    queueMatchmakingListError({ status: 500, code: 'internal_error', message: 'boom' });
    renderPage();

    await waitFor(() => expect(screen.getByText(/code: internal_error/i)).toBeInTheDocument());
  });

  it('Interested → optimistic remove + connection_created success toast', async () => {
    signedInAsLP();
    const successSpy = vi.mocked(toast.success);
    successSpy.mockClear();
    const user = userEvent.setup();
    renderPage();

    await waitFor(() => expect(screen.getByTestId('suggestions-grid')).toBeInTheDocument());
    expect(screen.getByText(/Acme Technologies/)).toBeInTheDocument();

    await user.click(screen.getByTestId('respond-accepted-c1d2e3f4-5a6b-4c8d-9e0f-1a2b3c4d5e6f'));

    // Card removes optimistically — Acme is gone, others remain.
    await waitFor(() => expect(screen.queryByText(/Acme Technologies/)).not.toBeInTheDocument());
    expect(screen.getByText(/Boltline Robotics/)).toBeInTheDocument();

    // Match toast surfaces because the MSW handler defaults to
    // connectionAlwaysCreatesPair=true.
    await waitFor(() =>
      expect(successSpy).toHaveBeenCalledWith(
        expect.stringContaining('Match! Connection request created'),
      ),
    );
  });

  it('Interested with no mutual → "Noted" toast', async () => {
    signedInAsLP();
    setMswConnectionAlwaysCreates(false);
    const successSpy = vi.mocked(toast.success);
    successSpy.mockClear();
    const user = userEvent.setup();
    renderPage();

    await waitFor(() => expect(screen.getByTestId('suggestions-grid')).toBeInTheDocument());
    await user.click(screen.getByTestId('respond-accepted-c1d2e3f4-5a6b-4c8d-9e0f-1a2b3c4d5e6f'));

    await waitFor(() =>
      expect(successSpy).toHaveBeenCalledWith(expect.stringContaining("Noted. We'll let you know")),
    );
  });
});
