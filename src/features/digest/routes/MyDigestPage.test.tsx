import { describe, expect, it, vi } from 'vitest';
import { Route, Routes } from 'react-router-dom';
import userEvent from '@testing-library/user-event';
import { renderWithProviders, screen, waitFor, within } from '@/test/test-utils';
import { MyDigestPage } from './MyDigestPage';
import { useAuthStore } from '@/auth/auth-store';
import {
  getMswDigestMePreferences,
  setMswDigestMeRows,
} from '@/test/msw-fixtures/digest-me-handlers';
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
      <Route path="/digest" element={<MyDigestPage />} />
    </Routes>,
    { route: '/digest' },
  );
}

describe('MyDigestPage', () => {
  it('renders the 3 seeded digest rows', async () => {
    signedIn();
    renderPage();

    await waitFor(() => expect(screen.getByTestId('digest-list')).toBeInTheDocument());
    const list = screen.getByTestId('digest-list');
    expect(within(list).getAllByText(/Your Weekly Warmup Update/).length).toBe(3);
  });

  it('shows the empty state when there are no digests', async () => {
    signedIn();
    setMswDigestMeRows([]);
    renderPage();

    await waitFor(() =>
      expect(screen.getByText(/Your first digest will land Monday morning/i)).toBeInTheDocument(),
    );
  });

  it('renders the preferences form with frequency radio + topic chips', async () => {
    signedIn();
    renderPage();

    await waitFor(() => expect(screen.getByTestId('freq-weekly')).toBeInTheDocument());
    expect(screen.getByTestId('freq-monthly')).toBeInTheDocument();
    expect(screen.getByTestId('freq-paused')).toBeInTheDocument();
    expect(screen.getByTestId('tag-chip-fintech')).toBeInTheDocument();
    expect(screen.getByTestId('opted-in-wa')).toBeInTheDocument();
  });

  it('submitting the preferences form updates frequency and toasts success', async () => {
    signedIn();
    const successSpy = vi.mocked(toast.success);
    successSpy.mockClear();
    const user = userEvent.setup();
    renderPage();

    await waitFor(() => expect(screen.getByTestId('freq-monthly')).toBeInTheDocument());
    await user.click(screen.getByTestId('freq-monthly'));
    await user.click(screen.getByRole('button', { name: /Save preferences/i }));

    await waitFor(() =>
      expect(successSpy).toHaveBeenCalledWith(expect.stringContaining('Preferences saved')),
    );
    expect(getMswDigestMePreferences().frequency).toBe('monthly');
  });

  it('clicking a digest row opens the snippet sheet', async () => {
    signedIn();
    const user = userEvent.setup();
    renderPage();

    await waitFor(() => expect(screen.getByTestId('digest-list')).toBeInTheDocument());
    const firstRow = screen.getAllByTestId(/^digest-row-/)[0]!;
    await user.click(firstRow);

    await waitFor(() => expect(screen.getByRole('dialog')).toBeInTheDocument());
    const dialog = screen.getByRole('dialog');
    expect(within(dialog).getByText(/defence-sector digest/i)).toBeInTheDocument();
  });

  it('admin user sees the "Admin digest console" link', async () => {
    signedInAsAdmin();
    renderPage();

    await waitFor(() => expect(screen.getByText(/Admin digest console/i)).toBeInTheDocument());
  });

  it('non-admin user does NOT see the "Admin digest console" link', async () => {
    signedIn();
    renderPage();

    await waitFor(() => expect(screen.getByTestId('digest-list')).toBeInTheDocument());
    expect(screen.queryByText(/Admin digest console/i)).not.toBeInTheDocument();
  });
});
