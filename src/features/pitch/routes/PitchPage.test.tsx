import { describe, expect, it, vi } from 'vitest';
import { Route, Routes } from 'react-router-dom';
import userEvent from '@testing-library/user-event';
import { renderWithProviders, screen, waitFor } from '@/test/test-utils';
import { PitchPage } from './PitchPage';
import { useAuthStore } from '@/auth/auth-store';
import { setMswDeckOutcome, setMswProfileScenario } from '@/test/msw-fixtures/pitch-handlers';

// Sonner is wired globally in the app shell; not part of this page render —
// stub for safety so success toasts don't crash JSDOM.
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

function renderPage(initialRoute = '/pitch') {
  return renderWithProviders(
    <Routes>
      <Route path="/pitch" element={<PitchPage />} />
    </Routes>,
    { route: initialRoute },
  );
}

describe('PitchPage', () => {
  it('renders the empty Create form when GET /pitch/profile returns 404', async () => {
    signedInStartup();
    setMswProfileScenario('missing');
    renderPage();

    await waitFor(() =>
      expect(screen.getByText(/create your startup profile/i)).toBeInTheDocument(),
    );
    // Only the Profile tab is visible — no Deck or Evaluation tab yet.
    expect(screen.getByTestId('pitch-tab-profile')).toBeInTheDocument();
    expect(screen.queryByTestId('pitch-tab-deck')).not.toBeInTheDocument();
    expect(screen.queryByTestId('pitch-tab-evaluation')).not.toBeInTheDocument();
  });

  it('renders the prefilled Edit form when a profile already exists', async () => {
    signedInStartup();
    renderPage();

    await waitFor(() => expect(screen.getByText(/edit startup profile/i)).toBeInTheDocument());
    // Deck tab becomes available because the profile is present.
    expect(screen.getByTestId('pitch-tab-deck')).toBeInTheDocument();
    // Field is prefilled with the seed company name.
    expect(screen.getByDisplayValue(/Acme Technologies/i)).toBeInTheDocument();
  });

  it('Deck tab + successful poll → renders the AI evaluation block', async () => {
    signedInStartup();
    setMswDeckOutcome('success', { pollsBeforeReady: 0 });
    const user = userEvent.setup();
    renderPage('/pitch?tab=deck');

    await waitFor(() => expect(screen.getByText(/submit pitch deck/i)).toBeInTheDocument());

    await user.type(screen.getByLabelText(/deck url/i), 'https://drive.google.com/file/d/abc/view');
    await user.click(screen.getByRole('button', { name: /submit deck/i }));

    await waitFor(
      () => {
        expect(screen.getByTestId('ai-signal-strong')).toBeInTheDocument();
      },
      { timeout: 5000 },
    );
    expect(screen.getByText(/Strong founder-market fit/i)).toBeInTheDocument();
    // Strengths bullet list rendered.
    expect(screen.getByText(/Experienced founders/i)).toBeInTheDocument();
  });
});
