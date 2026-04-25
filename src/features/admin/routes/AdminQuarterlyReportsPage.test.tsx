import { describe, expect, it, vi } from 'vitest';
import { Route, Routes } from 'react-router-dom';
import userEvent from '@testing-library/user-event';
import { renderWithProviders, screen, waitFor } from '@/test/test-utils';
import { AdminQuarterlyReportsPage } from './AdminQuarterlyReportsPage';
import { useAuthStore } from '@/auth/auth-store';
import { getMswQuarterlyApproveCount } from '@/test/msw-fixtures/admin-quarterly-reports-handlers';

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

function signedInAsAdmin() {
  useAuthStore.getState().setSession({
    token: 'msw-jwt.test',
    user: {
      id: '00000000-0000-4000-8000-000000000002',
      phone: '+911234567890',
      role: 'admin',
      name: 'Admin',
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
      <Route path="/admin/quarterly-reports" element={<AdminQuarterlyReportsPage />} />
    </Routes>,
    { route: '/admin/quarterly-reports' },
  );
}

describe('AdminQuarterlyReportsPage', () => {
  it('renders the seed report rows with status badges + drive links', async () => {
    signedInAsAdmin();
    renderPage();
    // Use a testid that only renders post-load to ensure the table is
    // mounted (the literal "Q1-2026" is also in the input placeholder, so a
    // getByText would resolve before the data actually lands).
    await screen.findByTestId('approve-r1-q1-2026');
    // The pending row exposes an Approve button; the sent row does not.
    expect(screen.queryByTestId('approve-r2-q4-2025')).not.toBeInTheDocument();
    // Drive links open in a new tab with rel="noopener noreferrer".
    const link = screen.getByTestId('drive-link-r1-q1-2026');
    expect(link.getAttribute('rel')).toContain('noopener');
    expect(link.getAttribute('rel')).toContain('noreferrer');
    expect(link.getAttribute('target')).toBe('_blank');
    // Both rows are present in the table body.
    expect(screen.getByTestId('drive-link-r2-q4-2025')).toBeInTheDocument();
  });

  it('approving a pending report opens the confirm dialog and fires the mutation', async () => {
    signedInAsAdmin();
    const user = userEvent.setup();
    renderPage();
    await screen.findByTestId('approve-r1-q1-2026');

    expect(getMswQuarterlyApproveCount()).toBe(0);
    await user.click(screen.getByTestId('approve-r1-q1-2026'));
    const dialog = await screen.findByRole('dialog', { name: /Approve Q1-2026 report/i });
    expect(dialog).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /Approve & distribute/i }));

    await waitFor(() => expect(getMswQuarterlyApproveCount()).toBe(1));
    // Row flips to "Approved, distributing…" once the list refetches.
    await waitFor(() =>
      expect(screen.getAllByText(/Approved, distributing/i).length).toBeGreaterThan(0),
    );
  });
});
