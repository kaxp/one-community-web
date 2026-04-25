import { describe, expect, it } from 'vitest';
import { Route, Routes } from 'react-router-dom';
import userEvent from '@testing-library/user-event';
import { renderWithProviders, screen, waitFor, within } from '@/test/test-utils';
import { ProfileViewersPage } from './ProfileViewersPage';
import { useAuthStore } from '@/auth/auth-store';
import {
  queueProfileViewersError,
  setMswProfileViewersFixture,
  setMswProfileViewersGenerated,
  setMswProfileViewersLeakPii,
} from '@/test/msw-fixtures/profile-viewers-handlers';

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

function renderPage() {
  return renderWithProviders(
    <Routes>
      <Route path="/profile-viewers" element={<ProfileViewersPage />} />
      <Route path="/profile/:id" element={<div data-testid="profile-page" />} />
    </Routes>,
    { route: '/profile-viewers' },
  );
}

describe('ProfileViewersPage', () => {
  it('renders the seeded 5 viewer cards with name + role + organisation', async () => {
    signedIn();
    renderPage();

    await waitFor(() => expect(screen.getByTestId('viewers-grid')).toBeInTheDocument());
    const grid = screen.getByTestId('viewers-grid');
    expect(within(grid).getByText(/Kapil Sahu/)).toBeInTheDocument();
    expect(within(grid).getByText(/Priya Rao/)).toBeInTheDocument();
    expect(within(grid).getByText(/Warmup Ventures/)).toBeInTheDocument();
    expect(within(grid).getByText(/NeoVC/)).toBeInTheDocument();
  });

  it('shows the empty state when there are no viewers', async () => {
    signedIn();
    setMswProfileViewersFixture([]);
    renderPage();

    await waitFor(() =>
      expect(screen.getByText(/No one has viewed your profile yet/i)).toBeInTheDocument(),
    );
  });

  it('renders ErrorState when the list fetch fails', async () => {
    signedIn();
    queueProfileViewersError({ status: 500, code: 'internal_error', message: 'boom' });
    renderPage();

    await waitFor(() => expect(screen.getByText(/code: internal_error/i)).toBeInTheDocument());
  });

  it('clicking a card navigates to /profile/{viewer.user_id}', async () => {
    signedIn();
    const user = userEvent.setup();
    renderPage();

    await waitFor(() => expect(screen.getByTestId('viewers-grid')).toBeInTheDocument());
    await user.click(screen.getByTestId('viewer-card-3c9a1e00-1d12-4b56-9ab0-4d2c8b0f3a12'));
    await waitFor(() => expect(screen.getByTestId('profile-page')).toBeInTheDocument());
  });

  it('paginates with the Load more button when next_cursor is present', async () => {
    signedIn();
    setMswProfileViewersGenerated(60);
    const user = userEvent.setup();
    renderPage();

    await waitFor(() => expect(screen.getByTestId('viewers-grid')).toBeInTheDocument());
    expect(screen.getByTestId('viewers-load-more')).toBeInTheDocument();

    await user.click(screen.getByTestId('viewers-load-more'));
    await waitFor(() => {
      const grid = screen.getByTestId('viewers-grid');
      expect(within(grid).getAllByRole('button').length).toBe(60);
    });
    expect(screen.queryByTestId('viewers-load-more')).not.toBeInTheDocument();
  });

  it('does NOT render leaked email / phone even if the backend includes them (§13 G11)', async () => {
    signedIn();
    setMswProfileViewersLeakPii(true);
    renderPage();

    await waitFor(() => expect(screen.getByTestId('viewers-grid')).toBeInTheDocument());
    // The MSW fixture splices these into the first row's payload.
    expect(screen.queryByText(/should-not-render@example\.com/)).not.toBeInTheDocument();
    expect(screen.queryByText(/\+919999999999/)).not.toBeInTheDocument();
  });
});
