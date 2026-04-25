import { describe, expect, it } from 'vitest';
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '@/test/test-utils';
import { AdminConnectionsPage } from './AdminConnectionsPage';
import { useAuthStore } from '@/auth/auth-store';
import { setMswAdminRows, queueAdminListError } from '@/test/msw-fixtures/admin-handlers';

function signInAsAdmin() {
  useAuthStore.getState().setSession({
    token: 'msw-jwt.test',
    user: {
      id: '22222222-2222-4000-8000-000000000003',
      phone: '+918087464723',
      role: 'admin',
      name: 'Kapil',
      email: 'kapil@warmupventures.com',
      organisation: null,
      profile_complete: true,
    },
    expiresAt: Date.now() + 60 * 60_000,
  });
}

describe('AdminConnectionsPage', () => {
  it('renders the pending_admin tab by default with seeded rows', async () => {
    signInAsAdmin();
    renderWithProviders(<AdminConnectionsPage />);

    await waitFor(() =>
      expect(
        screen.getAllByRole('tab').find((b) => b.getAttribute('aria-selected') === 'true'),
      ).toHaveTextContent(/pending admin/i),
    );
    // Approve buttons exist for the pending_admin rows
    expect(await screen.findAllByRole('button', { name: /^approve$/i })).not.toHaveLength(0);
  });

  it('switches tabs via URL when a tab is clicked', async () => {
    signInAsAdmin();
    const user = userEvent.setup();
    renderWithProviders(<AdminConnectionsPage />, { route: '/admin/connections' });

    await user.click(await screen.findByTestId('tab-accepted'));

    await waitFor(() => {
      expect(screen.getByTestId('tab-accepted')).toHaveAttribute('aria-selected', 'true');
    });
  });

  it('shows the empty state when the active tab has no rows', async () => {
    signInAsAdmin();
    setMswAdminRows([]);
    renderWithProviders(<AdminConnectionsPage />);

    await waitFor(() => {
      expect(screen.getByText(/no requests in this tab/i)).toBeInTheDocument();
    });
  });

  it('shows ErrorState when the list fetch fails', async () => {
    signInAsAdmin();
    queueAdminListError({ status: 500, code: 'internal_error', message: 'oops' });
    renderWithProviders(<AdminConnectionsPage />);

    await waitFor(() => {
      expect(screen.getByText(/something went wrong on our end/i)).toBeInTheDocument();
    });
  });

  it('approves a row and removes it from the visible list', async () => {
    signInAsAdmin();
    const user = userEvent.setup();
    renderWithProviders(<AdminConnectionsPage />);

    const approveButtons = await screen.findAllByRole('button', { name: /^approve$/i });
    const initial = approveButtons.length;
    expect(initial).toBeGreaterThanOrEqual(1);

    await user.click(approveButtons[0]!);

    await waitFor(() => {
      const after = screen.queryAllByRole('button', { name: /^approve$/i });
      expect(after.length).toBeLessThan(initial);
    });
  });
});

// Suppress unused-imports lint
void within;
