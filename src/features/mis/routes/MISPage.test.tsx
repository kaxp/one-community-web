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
      expect(screen.getAllByText(/MIS-Apr-2026\.xlsx/i).length).toBeGreaterThan(0),
    );
    expect(screen.getByTestId('mis-already-submitted-banner')).toBeInTheDocument();
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

  it('renders the upload form (period display, file dropzone, comment textarea)', async () => {
    signedInStartup();
    renderPage();
    await waitFor(() => expect(screen.getByText(/Upload your MIS report/i)).toBeInTheDocument());
    expect(screen.getByTestId('mis-period-display')).toHaveTextContent(/April 2026/i);
    expect(screen.getByText(/Drop your MIS file/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Comment/i)).toBeInTheDocument();
    // Submit button reads "Upload MIS" when no prior submission.
    expect(screen.getByRole('button', { name: /Upload MIS/i })).toBeInTheDocument();
  });

  it('renders past submissions from /portfolio/mis/history', async () => {
    signedInStartup();
    renderPage();
    const list = await screen.findByTestId('mis-history-list');
    expect(list).toBeInTheDocument();
    expect(screen.getByText(/March 2026/i)).toBeInTheDocument();
    expect(screen.getByText(/MIS-Mar-2026\.xlsx/i)).toBeInTheDocument();
  });

  it('submit button label switches to "Replace MIS" when last_submission is present', async () => {
    signedInStartup();
    setMisMswScenario('already_submitted');
    renderPage();
    await waitFor(() =>
      expect(screen.getByRole('button', { name: /Replace MIS/i })).toBeInTheDocument(),
    );
  });
});
