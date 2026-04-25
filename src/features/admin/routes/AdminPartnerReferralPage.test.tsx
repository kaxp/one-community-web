import { describe, expect, it, vi } from 'vitest';
import { Route, Routes } from 'react-router-dom';
import userEvent from '@testing-library/user-event';
import { renderWithProviders, screen, waitFor } from '@/test/test-utils';
import { AdminPartnerReferralPage } from './AdminPartnerReferralPage';
import { useAuthStore } from '@/auth/auth-store';
import {
  getMswPartnerReferralCallCount,
  setMswPartnerReferralCount,
} from '@/test/msw-fixtures/admin-partner-referral-handlers';
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
      <Route path="/admin/partner-referral" element={<AdminPartnerReferralPage />} />
    </Routes>,
    { route: '/admin/partner-referral' },
  );
}

describe('AdminPartnerReferralPage', () => {
  it('renders the form fields', () => {
    signedInAsAdmin();
    renderPage();
    expect(screen.getByLabelText(/Sector/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Startup name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Message/i)).toBeInTheDocument();
  });

  it('submits the form and toasts the partners_notified count', async () => {
    signedInAsAdmin();
    setMswPartnerReferralCount(5);
    const successSpy = vi.mocked(toast.success);
    successSpy.mockClear();
    const user = userEvent.setup();
    renderPage();

    await user.type(screen.getByLabelText(/Sector/i), 'fintech');
    await user.click(screen.getByRole('button', { name: /Send referral/i }));

    await waitFor(() => expect(getMswPartnerReferralCallCount()).toBe(1));
    await waitFor(() =>
      expect(successSpy).toHaveBeenCalledWith(expect.stringContaining('Notified 5 partners')),
    );
  });
});
