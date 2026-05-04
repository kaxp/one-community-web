import { describe, expect, it, vi } from 'vitest';
import { Route, Routes } from 'react-router-dom';
import userEvent from '@testing-library/user-event';
import { renderWithProviders, screen, waitFor } from '@/test/test-utils';
import { SchedulePage } from './SchedulePage';
import { useAuthStore } from '@/auth/auth-store';
import {
  queueAdminCalendarError,
  queueSlotsError,
  setMswSlotsFixture,
  SEED_DATE_A,
} from '@/test/msw-fixtures/schedule-handlers';

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

function signedIn(role: 'lp' | 'admin' | 'super_admin' = 'lp') {
  useAuthStore.getState().setSession({
    token: 'msw-jwt.test',
    user: {
      id: '00000000-0000-4000-8000-000000000004',
      phone: '+911234567892',
      role,
      name: role === 'lp' ? 'LP' : 'Admin',
      email: null,
      organisation: null,
      profile_complete: true,
    },
    expiresAt: Date.now() + 60 * 60_000,
  });
}

function renderPage(route = `/schedule?from_date=${SEED_DATE_A}&days=7`) {
  return renderWithProviders(
    <Routes>
      <Route path="/schedule" element={<SchedulePage />} />
    </Routes>,
    { route },
  );
}

describe('SchedulePage — role branching', () => {
  it('lp sees ParticipantBookingView (slot grid heading)', async () => {
    signedIn('lp');
    renderPage();
    await waitFor(() =>
      expect(screen.getByRole('heading', { name: /schedule a meeting/i })).toBeInTheDocument(),
    );
    expect(
      screen.queryByRole('heading', { name: /calendar — all upcoming meetings/i }),
    ).not.toBeInTheDocument();
  });

  it('admin sees AdminCalendarView (calendar heading)', async () => {
    signedIn('admin');
    renderPage('/schedule');
    await waitFor(() =>
      expect(
        screen.getByRole('heading', { name: /calendar — all upcoming meetings/i }),
      ).toBeInTheDocument(),
    );
    expect(screen.queryByRole('heading', { name: /schedule a meeting/i })).not.toBeInTheDocument();
  });

  it('super_admin also sees AdminCalendarView', async () => {
    signedIn('super_admin');
    renderPage('/schedule');
    await waitFor(() =>
      expect(
        screen.getByRole('heading', { name: /calendar — all upcoming meetings/i }),
      ).toBeInTheDocument(),
    );
  });
});

describe('AdminCalendarView', () => {
  it('renders seed meetings from the fixture', async () => {
    signedIn('admin');
    renderPage('/schedule');
    await screen.findByTestId('meeting-00000000-0000-4000-8000-000000000c01');
    expect(screen.getByText(/Arjun LP → Priya VC/)).toBeInTheDocument();
  });

  it('shows prev-week disabled when on today', async () => {
    signedIn('admin');
    renderPage('/schedule');
    await screen.findByTestId('prev-week');
    expect(screen.getByTestId('prev-week')).toBeDisabled();
  });

  it('next-week advances the from date', async () => {
    signedIn('admin');
    const user = userEvent.setup();
    renderPage('/schedule');
    await screen.findByTestId('next-week');
    await user.click(screen.getByTestId('next-week'));
    await waitFor(() => expect(screen.getByTestId('prev-week')).not.toBeDisabled());
  });

  it('clamps days > 60 client-side (hook should not send days > 60)', async () => {
    // Verify that even if we pass 120 days, the request goes out with days=60.
    // We test this indirectly: load the calendar and confirm it loads (the hook
    // clamping means MSW receives days<=60 and returns the seed, not a 422).
    signedIn('admin');
    renderPage('/schedule?from=2026-05-04&days=120');
    await screen.findByTestId('meeting-00000000-0000-4000-8000-000000000c01');
  });

  it('shows an error state when the calendar fetch fails', async () => {
    signedIn('admin');
    queueAdminCalendarError({ status: 500, code: 'internal_error', message: 'boom' });
    renderPage('/schedule');
    await waitFor(() =>
      expect(screen.getByText(/something went wrong on our end/i)).toBeInTheDocument(),
    );
  });
});

describe('SchedulePage — participant booking flow', () => {
  it('renders the slot grid with at least one available slot', async () => {
    signedIn();
    renderPage();

    await waitFor(() => expect(screen.getByTestId('slot-grid')).toBeInTheDocument());
    expect(screen.getByTestId(`slot-${SEED_DATE_A}T10:00:00+05:30`)).toBeInTheDocument();
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
    await user.click(screen.getByTestId(`slot-${SEED_DATE_A}T10:00:00+05:30`));

    await waitFor(() =>
      expect(screen.getByRole('dialog', { name: /book a meeting/i })).toBeInTheDocument(),
    );
    // Duration radios are present.
    expect(screen.getByLabelText(/30 min/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/60 min/i)).toBeInTheDocument();
  });
});
