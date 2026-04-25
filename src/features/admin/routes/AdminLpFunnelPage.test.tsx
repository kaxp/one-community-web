import { describe, expect, it, vi } from 'vitest';
import { Route, Routes } from 'react-router-dom';
import userEvent from '@testing-library/user-event';
import { renderWithProviders, screen, waitFor } from '@/test/test-utils';
import { AdminLpFunnelPage } from './AdminLpFunnelPage';
import { useAuthStore } from '@/auth/auth-store';
import {
  getMswLpFunnelPutCount,
  setMswLpFunnelStatus,
} from '@/test/msw-fixtures/admin-lp-funnel-handlers';

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

const LP_ID = '00000000-0000-4000-8000-000000000004';

function renderPage() {
  return renderWithProviders(
    <Routes>
      <Route path="/admin/lp-funnel/:user_id" element={<AdminLpFunnelPage />} />
    </Routes>,
    { route: `/admin/lp-funnel/${LP_ID}` },
  );
}

describe('AdminLpFunnelPage', () => {
  it('renders all 5 stage buttons with their human labels', async () => {
    signedInAsAdmin();
    renderPage();
    expect(screen.getByTestId('lp-funnel-btn-1_new_lead')).toBeInTheDocument();
    expect(screen.getByTestId('lp-funnel-btn-2_first_reach_out')).toBeInTheDocument();
    expect(screen.getByTestId('lp-funnel-btn-3_in_conversation')).toBeInTheDocument();
    expect(screen.getByTestId('lp-funnel-btn-4_soft_commit')).toBeInTheDocument();
    expect(screen.getByTestId('lp-funnel-btn-5_invested')).toBeInTheDocument();
    expect(screen.getByTestId('lp-funnel-btn-2_first_reach_out').textContent).toContain(
      'First reach-out',
    );
  });

  it('clicking a non-skip stage updates current and fires PUT once', async () => {
    signedInAsAdmin();
    setMswLpFunnelStatus(LP_ID, '1_new_lead');
    const user = userEvent.setup();
    renderPage();
    expect(getMswLpFunnelPutCount()).toBe(0);
    await user.click(screen.getByTestId('lp-funnel-btn-2_first_reach_out'));
    await waitFor(() => expect(getMswLpFunnelPutCount()).toBe(1));
    await waitFor(() =>
      expect(screen.getByTestId('lp-funnel-current')).toHaveTextContent(/First reach-out/i),
    );
  });

  it('skip without override → opens override dialog → confirm fires a second PUT', async () => {
    signedInAsAdmin();
    setMswLpFunnelStatus(LP_ID, '1_new_lead');
    const user = userEvent.setup();
    renderPage();
    expect(getMswLpFunnelPutCount()).toBe(0);
    await user.click(screen.getByTestId('lp-funnel-btn-3_in_conversation'));

    // First PUT returned 409. Override dialog appears.
    const dialog = await screen.findByRole('dialog', { name: /Skip funnel stages\?/i });
    expect(dialog).toBeInTheDocument();

    await user.click(screen.getByTestId('funnel-override-confirm'));
    // The MSW handler increments `putCounter` only on a successful PUT
    // (409 returns early without bumping). So the final count is 1: the
    // override re-PUT.
    await waitFor(() => expect(getMswLpFunnelPutCount()).toBe(1));
    await waitFor(() =>
      expect(screen.getByTestId('lp-funnel-current')).toHaveTextContent(/In Conversation/i),
    );
  });
});
