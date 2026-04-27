import { describe, expect, it } from 'vitest';
import { Route, Routes } from 'react-router-dom';
import { renderWithProviders, screen, waitFor } from '@/test/test-utils';
import { MISPage } from './MISPage';
import { useAuthStore } from '@/auth/auth-store';
import { setMisMswScenario } from '@/test/msw-fixtures/mis-handlers';

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

describe('MISPage (file-upload redesign, PRD §7.9)', () => {
  it('renders company name and current period', async () => {
    signedInStartup();
    renderPage();
    await waitFor(() => expect(screen.getByText(/Monthly MIS/i)).toBeInTheDocument());
    expect(screen.getByText(/Acme Technologies · April 2026/i)).toBeInTheDocument();
    expect(screen.queryByTestId('mis-already-submitted-banner')).not.toBeInTheDocument();
  });

  it('shows already-submitted banner when last_submission is present', async () => {
    signedInStartup();
    setMisMswScenario('already_submitted');
    renderPage();
    await waitFor(() =>
      expect(screen.getByTestId('mis-already-submitted-banner')).toBeInTheDocument(),
    );
    expect(screen.getByText(/MIS-Apr-2026\.xlsx/i)).toBeInTheDocument();
  });

  it('renders loading skeleton while fetching', () => {
    signedInStartup();
    renderPage();
    expect(screen.getByTestId('mis-loading')).toBeInTheDocument();
  });

  it('renders ErrorState on 500', async () => {
    signedInStartup();
    setMisMswScenario('error_500');
    renderPage();
    await waitFor(() => expect(screen.getByRole('alert')).toBeInTheDocument());
  });
});
