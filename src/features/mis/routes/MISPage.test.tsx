import { describe, expect, it, vi } from 'vitest';
import { Route, Routes } from 'react-router-dom';
import userEvent from '@testing-library/user-event';
import { renderWithProviders, screen, waitFor } from '@/test/test-utils';
import { MISPage } from './MISPage';
import { useAuthStore } from '@/auth/auth-store';
import { setMswMisAlreadySubmitted, queueMisFormError } from '@/test/msw-fixtures/mis-handlers';

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

function signedInStartup() {
  useAuthStore.getState().setSession({
    token: 'msw-jwt.test',
    user: {
      id: '00000000-0000-4000-8000-000000000005',
      phone: '+911234567894',
      role: 'startup_funded',
      name: 'Founder',
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
      <Route path="/mis" element={<MISPage />} />
    </Routes>,
    { route: '/mis' },
  );
}

describe('MISPage', () => {
  it('renders the form prefilled with last-month values', async () => {
    signedInStartup();
    renderPage();

    await waitFor(() => expect(screen.getByText(/Monthly MIS/i)).toBeInTheDocument());
    expect(screen.getByText(/Acme Technologies · April 2026/i)).toBeInTheDocument();
    // Revenue prefill is 2,000,000 — input shows the number; hint shows
    // last-month INR formatting.
    expect(screen.getByLabelText(/revenue/i)).toHaveValue(2000000);
    expect(screen.getByLabelText(/burn/i)).toHaveValue(1500000);
    expect(screen.queryByTestId('mis-already-submitted-banner')).not.toBeInTheDocument();
  });

  it('shows the already-submitted banner and disables the submit button', async () => {
    signedInStartup();
    setMswMisAlreadySubmitted('2026-04-23T15:45:00.000Z');
    renderPage();

    await waitFor(() =>
      expect(screen.getByTestId('mis-already-submitted-banner')).toBeInTheDocument(),
    );
    expect(screen.getByRole('button', { name: /already submitted/i })).toBeInTheDocument();
  });

  it('renders ErrorState when the form fetch fails', async () => {
    signedInStartup();
    queueMisFormError({ status: 500, code: 'internal_error', message: 'boom' });
    renderPage();

    await waitFor(() => expect(screen.getByRole('alert')).toBeInTheDocument());
    expect(screen.getByText(/code: internal_error/i)).toBeInTheDocument();
  });

  it('submits successfully → 409 on resubmit, form values retained', async () => {
    signedInStartup();
    const user = userEvent.setup();
    renderPage();

    await waitFor(() => expect(screen.getByText(/Monthly MIS/i)).toBeInTheDocument());

    // Edit highlights so we can verify the form keeps state on 409.
    const highlights = screen.getByLabelText(/highlights/i);
    await user.clear(highlights);
    await user.type(highlights, 'Q1 closed strong');

    await user.click(screen.getByRole('button', { name: /submit mis for 2026-04/i }));

    // First submit succeeds → form stays on the page; banner now shows. The
    // page refetches `qk.mis.form`, which now reports already_submitted=true.
    await waitFor(() =>
      expect(screen.getByTestId('mis-already-submitted-banner')).toBeInTheDocument(),
    );
    // Highlights field must retain the typed value (not cleared).
    expect(screen.getByLabelText(/highlights/i)).toHaveValue('Q1 closed strong');
  });
});
