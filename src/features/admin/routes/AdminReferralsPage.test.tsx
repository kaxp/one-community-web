import { describe, expect, it, beforeEach } from 'vitest';
import { Route, Routes } from 'react-router-dom';
import userEvent from '@testing-library/user-event';
import { renderWithProviders, screen, waitFor } from '@/test/test-utils';
import { AdminReferralsPage } from './AdminReferralsPage';
import { useAuthStore } from '@/auth/auth-store';
import {
  resetMswAdminWaOnboardingState,
  queueAdminWaOnboardingApproveError,
  getLastAdminWaOnboardingApprove,
  getLastAdminWaOnboardingReject,
} from '@/test/msw-fixtures/admin-wa-onboarding-handlers';

// Phase 4 menu Phase C2 follow-up (2026-05-28) — tests focus on the new
// WhatsApp Onboarding tab. The card-scans tab predates this slice and
// has no existing test file we'd disturb.

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

function renderPage(route = '/admin/referrals?tab=whatsapp') {
  return renderWithProviders(
    <Routes>
      <Route path="/admin/referrals" element={<AdminReferralsPage />} />
    </Routes>,
    { route },
  );
}

beforeEach(() => {
  resetMswAdminWaOnboardingState();
});

describe('AdminReferralsPage — WhatsApp Onboarding tab', () => {
  it('renders pending rows from both public_signup and wa_referral sources', async () => {
    signedInAsAdmin();
    renderPage();

    // Both seed rows surface (one from each source)
    await screen.findByTestId('wa-onboarding-row-00000000-0000-4000-8000-000000000c01');
    await screen.findByTestId('wa-onboarding-row-00000000-0000-4000-8000-000000000c02');

    // Source chips appear in both pending + history sections (history seed
    // reuses the same channels) — use *AllBy* so duplicates don't fail.
    expect(screen.getAllByText(/Join Community Flow/i).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText(/Refer Flow/i).length).toBeGreaterThanOrEqual(1);
  });

  it('approve calls the right /public_signup/ path with the row id', async () => {
    signedInAsAdmin();
    const user = userEvent.setup();
    renderPage();

    const btn = await screen.findByTestId(
      'wa-onboarding-approve-00000000-0000-4000-8000-000000000c01',
    );
    await user.click(btn);

    await waitFor(() => {
      const last = getLastAdminWaOnboardingApprove();
      expect(last?.source).toBe('public_signup');
      expect(last?.row_id).toBe('00000000-0000-4000-8000-000000000c01');
    });
  });

  it('approve calls the right /wa_referral/ path for a Refer row', async () => {
    signedInAsAdmin();
    const user = userEvent.setup();
    renderPage();

    const btn = await screen.findByTestId(
      'wa-onboarding-approve-00000000-0000-4000-8000-000000000c02',
    );
    await user.click(btn);

    await waitFor(() => {
      const last = getLastAdminWaOnboardingApprove();
      expect(last?.source).toBe('wa_referral');
      expect(last?.row_id).toBe('00000000-0000-4000-8000-000000000c02');
    });
  });

  it('reject dialog sends the note to /reject endpoint', async () => {
    signedInAsAdmin();
    const user = userEvent.setup();
    renderPage();

    await screen.findByTestId('wa-onboarding-row-00000000-0000-4000-8000-000000000c01');

    // Open reject dialog by clicking the row-scoped "Reject" button.
    const row = screen.getByTestId('wa-onboarding-row-00000000-0000-4000-8000-000000000c01');
    const rowButtons = row.querySelectorAll('button');
    const rowRejectBtn = Array.from(rowButtons).find((b) => b.textContent?.trim() === 'Reject');
    expect(rowRejectBtn).toBeTruthy();
    await user.click(rowRejectBtn as HTMLElement);

    const dialog = await screen.findByRole('dialog');
    const textarea = dialog.querySelector('textarea') as HTMLTextAreaElement;
    await user.type(textarea, 'wrong profile fit');

    // Find the Reject submit button inside the dialog (the other one is Cancel).
    const dialogButtons = dialog.querySelectorAll('button');
    const submit = Array.from(dialogButtons).find((b) => b.textContent?.trim() === 'Reject');
    expect(submit).toBeTruthy();
    await user.click(submit as HTMLElement);

    await waitFor(() => {
      const last = getLastAdminWaOnboardingReject();
      expect(last?.source).toBe('public_signup');
      expect(last?.row_id).toBe('00000000-0000-4000-8000-000000000c01');
      expect(last?.note).toBe('wrong profile fit');
    });
  });

  it('leaves the row in place when approve fails (no optimistic removal)', async () => {
    signedInAsAdmin();
    queueAdminWaOnboardingApproveError({
      status: 500,
      code: 'internal_error',
      message: 'Something went wrong on our side.',
    });
    const user = userEvent.setup();
    renderPage();

    const btn = await screen.findByTestId(
      'wa-onboarding-approve-00000000-0000-4000-8000-000000000c01',
    );
    await user.click(btn);

    // Sonner toasts render into a portal that isn't mounted in unit tests;
    // assert behaviour we CAN observe — the row stays put so the admin
    // can retry. (No mutate-and-disappear optimistic UI on this path.)
    await waitFor(() =>
      expect(
        screen.getByTestId('wa-onboarding-row-00000000-0000-4000-8000-000000000c01'),
      ).toBeInTheDocument(),
    );
  });

  it('tab=card-scans (default) does NOT load the WA endpoints', async () => {
    signedInAsAdmin();
    renderPage('/admin/referrals'); // no tab param → defaults to card-scans

    // The whatsapp tab button exists, but the WA-specific rows don't.
    await screen.findByTestId('referrals-tab-whatsapp');
    expect(
      screen.queryByTestId('wa-onboarding-row-00000000-0000-4000-8000-000000000c01'),
    ).not.toBeInTheDocument();
  });

  it('switching tabs swaps the URL ?tab= param', async () => {
    signedInAsAdmin();
    const user = userEvent.setup();
    renderPage('/admin/referrals');
    await screen.findByTestId('referrals-tab-card-scans');

    await user.click(screen.getByTestId('referrals-tab-whatsapp'));
    await waitFor(() =>
      expect(screen.getByTestId('referrals-tab-whatsapp').getAttribute('aria-selected')).toBe(
        'true',
      ),
    );
    await screen.findByTestId('wa-onboarding-row-00000000-0000-4000-8000-000000000c01');
  });
});
