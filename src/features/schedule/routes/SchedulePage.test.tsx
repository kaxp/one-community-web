import { describe, expect, it, vi } from 'vitest';
import { Route, Routes } from 'react-router-dom';
import userEvent from '@testing-library/user-event';
import { renderWithProviders, screen, waitFor } from '@/test/test-utils';
import { SchedulePage } from './SchedulePage';
import { useAuthStore } from '@/auth/auth-store';
import { queueSlotsError, setMswSlotsFixture } from '@/test/msw-fixtures/schedule-handlers';

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

function renderPage(route = '/schedule?from_date=2026-04-26&days=7') {
  return renderWithProviders(
    <Routes>
      <Route path="/schedule" element={<SchedulePage />} />
    </Routes>,
    { route },
  );
}

describe('SchedulePage', () => {
  it('renders the slot grid with at least one available slot', async () => {
    signedIn();
    renderPage();

    await waitFor(() => expect(screen.getByTestId('slot-grid')).toBeInTheDocument());
    // Seed fixture provides a 2026-04-26T10:00 IST slot.
    expect(screen.getByTestId('slot-2026-04-26T10:00:00+05:30')).toBeInTheDocument();
    // Bookings list also renders the seed booking row (Priya Rao).
    await waitFor(() => expect(screen.getByText(/Priya Rao/i)).toBeInTheDocument());
  });

  it('shows an empty state when no slots are available, with a Try 30 days CTA', async () => {
    signedIn();
    setMswSlotsFixture([]);
    renderPage();

    await waitFor(() => expect(screen.getByText(/No available slots/i)).toBeInTheDocument());
    expect(screen.getAllByRole('button', { name: /try 30 days/i }).length).toBeGreaterThan(0);
  });

  it('renders ErrorState when the slots fetch fails', async () => {
    signedIn();
    queueSlotsError({ status: 500, code: 'internal_error', message: 'boom' });
    renderPage();

    await waitFor(() => expect(screen.getByText(/code: internal_error/i)).toBeInTheDocument());
  });

  it('opens the booking dialog when a slot is clicked', async () => {
    signedIn();
    const user = userEvent.setup();
    renderPage();

    await waitFor(() => expect(screen.getByTestId('slot-grid')).toBeInTheDocument());
    await user.click(screen.getByTestId('slot-2026-04-26T10:00:00+05:30'));

    await waitFor(() =>
      expect(screen.getByRole('dialog', { name: /book a meeting/i })).toBeInTheDocument(),
    );
    // Duration radios are present.
    expect(screen.getByLabelText(/30 min/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/60 min/i)).toBeInTheDocument();
  });
});
