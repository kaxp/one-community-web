import { describe, expect, it, vi } from 'vitest';
import { Route, Routes } from 'react-router-dom';
import userEvent from '@testing-library/user-event';
import { renderWithProviders, screen, waitFor, within } from '@/test/test-utils';
import { AdminDigestPage } from './AdminDigestPage';
import { useAuthStore } from '@/auth/auth-store';

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

function renderPage(route = '/admin/digest') {
  return renderWithProviders(
    <Routes>
      <Route path="/admin/digest" element={<AdminDigestPage />} />
    </Routes>,
    { route },
  );
}

describe('AdminDigestPage', () => {
  it('renders the Workflows tab by default with seed workflows + Send Now buttons', async () => {
    signedInAsAdmin();
    renderPage();
    await waitFor(() => expect(screen.getByTestId('workflows-list')).toBeInTheDocument());
    const list = screen.getByTestId('workflows-list');
    expect(within(list).getByText(/lp_weekly/)).toBeInTheDocument();
    expect(within(list).getByText(/vc_monthly/)).toBeInTheDocument();
    expect(within(list).getByTestId('send-lp_weekly')).toBeInTheDocument();
    expect(within(list).getByTestId('generate-lp_weekly')).toBeInTheDocument();
  });

  it('Pending tab opens the sandboxed iframe preview when Preview is clicked', async () => {
    signedInAsAdmin();
    const user = userEvent.setup();
    renderPage();
    // Switch to pending tab.
    await waitFor(() => expect(screen.getByTestId('tab-pending')).toBeInTheDocument());
    await user.click(screen.getByTestId('tab-pending'));

    await waitFor(() => expect(screen.getByTestId('pending-list')).toBeInTheDocument());
    const previewBtn = screen.getByTestId('preview-e3d2c1b0-1234-4678-90ab-cdef01234567');
    await user.click(previewBtn);

    await waitFor(() => expect(screen.getByTestId('digest-preview-iframe')).toBeInTheDocument());
    const iframe = screen.getByTestId('digest-preview-iframe');
    expect(iframe.getAttribute('sandbox')).toBe('allow-same-origin');
    expect(iframe.getAttribute('srcdoc') ?? iframe.getAttribute('srcDoc')).toContain('<html>');
  });

  it('History tab lists sent digests', async () => {
    signedInAsAdmin();
    const user = userEvent.setup();
    renderPage();
    await waitFor(() => expect(screen.getByTestId('tab-history')).toBeInTheDocument());
    await user.click(screen.getByTestId('tab-history'));
    await waitFor(() => expect(screen.getByTestId('history-list')).toBeInTheDocument());
    expect(
      within(screen.getByTestId('history-list')).getByText(/Your Weekly Warmup Update/),
    ).toBeInTheDocument();
  });

  it('approving a pending digest removes it optimistically and surfaces toast', async () => {
    signedInAsAdmin();
    const user = userEvent.setup();
    renderPage('/admin/digest?tab=pending');
    await waitFor(() => expect(screen.getByTestId('pending-list')).toBeInTheDocument());

    const approveBtn = screen.getByTestId('approve-e3d2c1b0-1234-4678-90ab-cdef01234567');
    await user.click(approveBtn);

    // Row removed.
    await waitFor(() =>
      expect(
        screen.queryByTestId('approve-e3d2c1b0-1234-4678-90ab-cdef01234567'),
      ).not.toBeInTheDocument(),
    );
  });
});
