import { describe, expect, it, vi } from 'vitest';
import { Route, Routes } from 'react-router-dom';
import userEvent from '@testing-library/user-event';
import { renderWithProviders, screen, waitFor, within } from '@/test/test-utils';
import { TravelPage } from './TravelPage';
import { useAuthStore } from '@/auth/auth-store';
import {
  getMswTravelPlans,
  queueTravelListError,
  setMswTravelPlansFixture,
} from '@/test/msw-fixtures/travel-handlers';

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
      home_city: null,
    },
    expiresAt: Date.now() + 60 * 60_000,
  });
}

function renderPage(route = '/travel') {
  return renderWithProviders(
    <Routes>
      <Route path="/travel" element={<TravelPage />} />
    </Routes>,
    { route },
  );
}

describe('TravelPage', () => {
  it('renders the home-city panel and the upcoming trips list (active_only by default)', async () => {
    signedIn();
    renderPage();

    // Home-city panel is the ExecutionPanel above the trips list.
    expect(screen.getByRole('heading', { name: /your home city/i })).toBeInTheDocument();

    await waitFor(() => expect(screen.getByTestId('trip-list')).toBeInTheDocument());
    const list = screen.getByTestId('trip-list');
    // Seed: Bengaluru + Mumbai are upcoming; Delhi (Jan 2026) is filtered out.
    expect(within(list).getByText(/Bengaluru/)).toBeInTheDocument();
    expect(within(list).getByText(/Mumbai/)).toBeInTheDocument();
    expect(within(list).queryByText(/Delhi/)).not.toBeInTheDocument();
  });

  it('toggling "Show past trips" reveals the past trip', async () => {
    signedIn();
    const user = userEvent.setup();
    renderPage();

    await waitFor(() => expect(screen.getByTestId('trip-list')).toBeInTheDocument());
    await user.click(screen.getByTestId('toggle-show-past'));

    await waitFor(() => {
      const list = screen.getByTestId('trip-list');
      expect(within(list).getByText(/Delhi/)).toBeInTheDocument();
    });
  });

  it('shows an empty state when there are no upcoming trips', async () => {
    signedIn();
    setMswTravelPlansFixture([]);
    renderPage();

    await waitFor(() => expect(screen.getByText(/No upcoming trips/i)).toBeInTheDocument());
  });

  it('renders ErrorState when the list fetch fails', async () => {
    signedIn();
    queueTravelListError({ status: 500, code: 'internal_error', message: 'boom' });
    renderPage();

    await waitFor(() => expect(screen.getByText(/code: internal_error/i)).toBeInTheDocument());
  });

  it('add-trip flow creates a new trip and refetches the list', async () => {
    signedIn();
    const user = userEvent.setup();
    renderPage();

    await waitFor(() => expect(screen.getByTestId('trip-list')).toBeInTheDocument());

    await user.click(screen.getByTestId('add-trip'));

    const dialog = await screen.findByRole('dialog', { name: /add a trip/i });
    await user.type(within(dialog).getByLabelText(/destination city/i), 'Hyderabad');
    // start/end are pre-seeded with today's date — use 2026-09-01..2026-09-02.
    const startInput = within(dialog).getByLabelText(/start date/i);
    const endInput = within(dialog).getByLabelText(/end date/i);
    await user.clear(startInput);
    await user.type(startInput, '2026-09-01');
    await user.clear(endInput);
    await user.type(endInput, '2026-09-03');
    await user.click(within(dialog).getByRole('button', { name: /add trip/i }));

    // Dialog closes on success; the new row appears in the list.
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    await waitFor(() => {
      const list = screen.getByTestId('trip-list');
      expect(within(list).getByText(/Hyderabad/)).toBeInTheDocument();
    });
    expect(getMswTravelPlans().some((p) => p.destination_city === 'Hyderabad')).toBe(true);
  });

  it('cancel-trip flow optimistically removes the row and confirms server-side', async () => {
    signedIn();
    const user = userEvent.setup();
    renderPage();

    await waitFor(() => expect(screen.getByTestId('trip-list')).toBeInTheDocument());
    const list1 = screen.getByTestId('trip-list');
    expect(within(list1).getByText(/Bengaluru/)).toBeInTheDocument();

    const cancelBtn = screen.getByTestId('cancel-trip-a1b2c3d4-0000-4000-8000-000000000001');
    await user.click(cancelBtn);

    const dialog = await screen.findByRole('dialog', { name: /cancel this trip\?/i });
    await user.click(within(dialog).getByRole('button', { name: /cancel trip/i }));

    // Optimistic remove → Bengaluru gone from the list; server flip to
    // cancelled → active_only=true filter still hides it. Mumbai stays.
    await waitFor(() => {
      const list = screen.getByTestId('trip-list');
      expect(within(list).queryByText(/Bengaluru/)).not.toBeInTheDocument();
      expect(within(list).getByText(/Mumbai/)).toBeInTheDocument();
    });
  });
});
