import { describe, expect, it } from 'vitest';
import { Route, Routes } from 'react-router-dom';
import { renderWithProviders, screen, waitFor } from '@/test/test-utils';
import { AdminHomePage } from './AdminHomePage';
import { useAuthStore } from '@/auth/auth-store';
import {
  queueAdminSummaryError,
  setMswAdminSummary,
} from '@/test/msw-fixtures/admin-home-handlers';

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
      <Route path="/admin" element={<AdminHomePage />} />
      <Route path="/admin/connections" element={<div data-testid="admin-connections" />} />
    </Routes>,
    { route: '/admin' },
  );
}

describe('AdminHomePage', () => {
  it('renders KPI cards for pending connections, MIS, and recent digests', async () => {
    signedInAsAdmin();
    renderPage();

    // Wait for the data-driven section to render (loading skeleton swaps out).
    await waitFor(() => expect(screen.getByText(/Acme Technologies/)).toBeInTheDocument());
    expect(screen.getByText(/Pending connections/i)).toBeInTheDocument();
    expect(screen.getByText(/MIS — current month/i)).toBeInTheDocument();
    expect(screen.getByText(/Recent digests/i)).toBeInTheDocument();
    expect(screen.getByText(/NeoLedger/)).toBeInTheDocument();
  });

  it('pending count link points at the connections queue', async () => {
    signedInAsAdmin();
    renderPage();
    await waitFor(() => expect(screen.getByTestId('kpi-pending-link')).toBeInTheDocument());
    expect(screen.getByTestId('kpi-pending-link').getAttribute('href')).toContain(
      '/admin/connections',
    );
  });

  it('shows ErrorState when the summary fetch fails', async () => {
    signedInAsAdmin();
    queueAdminSummaryError({ status: 500, code: 'internal_error', message: 'boom' });
    renderPage();
    await waitFor(() => expect(screen.getByText(/code: internal_error/i)).toBeInTheDocument());
  });

  it('renders empty fallbacks when arrays are empty', async () => {
    signedInAsAdmin();
    setMswAdminSummary({
      pending_connection_count: 0,
      mis_status: [],
      recent_digests: [],
      recent_actions: [],
    });
    renderPage();
    await waitFor(() =>
      expect(screen.getByText(/No portfolio companies yet/i)).toBeInTheDocument(),
    );
    expect(screen.getByText(/No digests sent yet/i)).toBeInTheDocument();
    expect(screen.getByText(/No actions in the last window/i)).toBeInTheDocument();
  });
});
