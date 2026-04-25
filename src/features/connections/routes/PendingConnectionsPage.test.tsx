import { describe, expect, it, vi } from 'vitest';
import { Route, Routes } from 'react-router-dom';
import userEvent from '@testing-library/user-event';
import { toast } from 'sonner';
import { renderWithProviders, screen, waitFor } from '@/test/test-utils';
import { PendingConnectionsPage } from './PendingConnectionsPage';
import { useAuthStore } from '@/auth/auth-store';
import { queueRespondError, setMswPendingRows } from '@/test/msw-fixtures/connections-handlers';

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

function renderPage(initialRoute = '/connections/pending') {
  return renderWithProviders(
    <Routes>
      <Route path="/connections/pending" element={<PendingConnectionsPage />} />
    </Routes>,
    { route: initialRoute },
  );
}

const PRIYA_INCOMING = 'bb22cc33-dd44-4000-8000-001122334466';

describe('PendingConnectionsPage', () => {
  it('defaults to the Incoming tab and shows Accept/Decline on incoming pending_target rows', async () => {
    signedIn();
    renderPage();

    await waitFor(() =>
      expect(screen.getByTestId('direction-incoming')).toHaveAttribute('aria-selected', 'true'),
    );
    expect(await screen.findByRole('button', { name: /^accept$/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^decline$/i })).toBeInTheDocument();
    // Counterpart name from incoming row
    expect(screen.getByText('Priya Rao')).toBeInTheDocument();
  });

  it('switches to Outgoing tab via URL search param and HIDES Accept/Decline (status pill instead)', async () => {
    signedIn();
    const user = userEvent.setup();
    renderPage();

    await user.click(await screen.findByTestId('direction-outgoing'));
    await waitFor(() =>
      expect(screen.getByTestId('direction-outgoing')).toHaveAttribute('aria-selected', 'true'),
    );

    // Outgoing rows show the counterpart name…
    expect(screen.getByText('Aryan Mehta')).toBeInTheDocument();
    // …and a status pill, not Accept/Decline.
    expect(screen.queryByRole('button', { name: /^accept$/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^decline$/i })).not.toBeInTheDocument();
    expect(screen.getByText(/awaiting admin/i)).toBeInTheDocument();
  });

  it('Accept on an incoming row optimistically removes it from the visible list', async () => {
    signedIn();
    const user = userEvent.setup();
    renderPage();

    const acceptBtn = await screen.findByRole('button', { name: /^accept$/i });
    await user.click(acceptBtn);

    await waitFor(() => {
      expect(screen.queryByTestId(`pending-${PRIYA_INCOMING}`)).not.toBeInTheDocument();
    });
  });

  it('on conflict (409 from respond), surfaces a single error toast and rolls back', async () => {
    signedIn();
    (toast.error as ReturnType<typeof vi.fn>).mockClear();
    queueRespondError({ status: 409, code: 'conflict', message: 'already handled' });
    const user = userEvent.setup();
    renderPage();

    const acceptBtn = await screen.findByRole('button', { name: /^accept$/i });
    await user.click(acceptBtn);

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith('This was already handled — refreshing');
    });
  });

  it('renders an empty-state message when the active direction has no rows', async () => {
    signedIn();
    setMswPendingRows([]);
    renderPage();

    await waitFor(() => expect(screen.getByText(/no incoming requests/i)).toBeInTheDocument());
  });
});
