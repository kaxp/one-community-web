import { describe, expect, it } from 'vitest';
import { renderWithProviders, screen, waitFor } from '@/test/test-utils';
import { ConnectionsPage } from './ConnectionsPage';
import { useAuthStore } from '@/auth/auth-store';
import {
  queueConnectionsListError,
  setMswConnectionsRows,
} from '@/test/msw-fixtures/connections-handlers';

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

describe('ConnectionsPage', () => {
  it('renders the seeded accepted rows with name + contact strip', async () => {
    signedIn();
    renderWithProviders(<ConnectionsPage />);
    // Kapil Sahu appears in the card and also in the FeedbackPrompt copy —
    // two elements, both expected.
    await waitFor(() => {
      expect(screen.getAllByText('Kapil Sahu').length).toBeGreaterThanOrEqual(1);
    });
    // Contact strip surfaces email when contact is populated.
    expect(screen.getByText('kapil@acme.ai')).toBeInTheDocument();
  });

  it('shows the empty state when no connections exist', async () => {
    signedIn();
    setMswConnectionsRows([]);
    renderWithProviders(<ConnectionsPage />);
    await waitFor(() => {
      expect(screen.getByText(/no connections yet/i)).toBeInTheDocument();
    });
  });

  it('shows ErrorState when the list fetch fails', async () => {
    signedIn();
    queueConnectionsListError({ status: 500, code: 'internal_error', message: 'oops' });
    renderWithProviders(<ConnectionsPage />);
    await waitFor(() => {
      expect(screen.getByText(/something went wrong on our end/i)).toBeInTheDocument();
    });
  });

  it('renders the 48h feedback prompt when an unsubmitted intro_id is present', async () => {
    signedIn();
    renderWithProviders(<ConnectionsPage />);
    await waitFor(() => {
      // Kapil row has intro_id + feedback_submitted=false → prompt visible.
      expect(screen.getByText(/feel useful\?/i)).toBeInTheDocument();
    });
  });
});
