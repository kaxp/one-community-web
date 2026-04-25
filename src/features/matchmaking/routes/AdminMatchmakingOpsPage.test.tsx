import { describe, expect, it, vi } from 'vitest';
import { Route, Routes } from 'react-router-dom';
import userEvent from '@testing-library/user-event';
import { renderWithProviders, screen, waitFor } from '@/test/test-utils';
import { AdminMatchmakingOpsPage } from './AdminMatchmakingOpsPage';
import { useAuthStore } from '@/auth/auth-store';
import {
  getMswMatchmakingApproveCount,
  setMswMatchmakingPending,
} from '@/test/msw-fixtures/admin-matchmaking-ops-handlers';

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
      <Route path="/admin/matchmaking" element={<AdminMatchmakingOpsPage />} />
    </Routes>,
    { route: '/admin/matchmaking' },
  );
}

describe('AdminMatchmakingOpsPage', () => {
  it('renders the Generate panel + pending suggestions table grouped by week_of', async () => {
    signedInAsAdmin();
    renderPage();
    await waitFor(() => expect(screen.getByText(/Generate this week/i)).toBeInTheDocument());
    expect(screen.getByLabelText(/Week of/i)).toBeInTheDocument();

    // Pending rows.
    await waitFor(() => expect(screen.getByText(/Acme Technologies/)).toBeInTheDocument());
    expect(screen.getByText(/Boltline Robotics/)).toBeInTheDocument();
    expect(screen.getByText(/Week of 2026-04-28/i)).toBeInTheDocument();
  });

  it('shows the empty state when there are no pending suggestions', async () => {
    signedInAsAdmin();
    setMswMatchmakingPending([]);
    renderPage();
    await waitFor(() => expect(screen.getByText(/No pending suggestions/i)).toBeInTheDocument());
  });

  it('approving a row removes it optimistically and increments the server-side count', async () => {
    signedInAsAdmin();
    const user = userEvent.setup();
    renderPage();

    await waitFor(() => expect(screen.getByText(/Acme Technologies/)).toBeInTheDocument());
    expect(getMswMatchmakingApproveCount()).toBe(0);

    await user.click(screen.getByTestId('approve-c1d2e3f4-5a6b-4c8d-9e0f-1a2b3c4d5e6f'));

    await waitFor(() => expect(screen.queryByText(/Acme Technologies/)).not.toBeInTheDocument());
    await waitFor(() => expect(getMswMatchmakingApproveCount()).toBe(1));
  });
});
