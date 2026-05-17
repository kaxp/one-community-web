import { describe, expect, it } from 'vitest';
import { Route, Routes } from 'react-router-dom';
import userEvent from '@testing-library/user-event';
import { renderWithProviders, screen, waitFor } from '@/test/test-utils';
import { MyDigestPage } from './MyDigestPage';
import { useAuthStore } from '@/auth/auth-store';

// ── Auth helpers ─────────────────────────────────────────────────────────

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

// ── Tests ────────────────────────────────────────────────────────────────

describe('MyDigestPage', () => {
  it('renders the hero section with weekly headline and CTA button', async () => {
    signedIn();
    renderPage();

    await waitFor(() => expect(screen.getByText(/Defense-tech sovereignty/i)).toBeInTheDocument());
    expect(screen.getByRole('button', { name: /Read Full Digest/i })).toBeInTheDocument();
  });

  it('clicking "Read Full Digest" expands the digest and shows tab nav', async () => {
    signedIn();
    const user = userEvent.setup();
    renderPage();

    await waitFor(() =>
      expect(screen.getByRole('button', { name: /Read Full Digest/i })).toBeInTheDocument(),
    );
    await user.click(screen.getByRole('button', { name: /Read Full Digest/i }));

    // Tab navigation must appear
    await waitFor(() =>
      expect(screen.getByRole('button', { name: /^Portfolio$/i })).toBeInTheDocument(),
    );
    expect(screen.getByRole('button', { name: /Startup News/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Tool of Month/i })).toBeInTheDocument();
  });

  it('Portfolio tab renders by default and shows portfolio company cards', async () => {
    signedIn();
    const user = userEvent.setup();
    renderPage();

    await waitFor(() =>
      expect(screen.getByRole('button', { name: /Read Full Digest/i })).toBeInTheDocument(),
    );
    await user.click(screen.getByRole('button', { name: /Read Full Digest/i }));

    // Portfolio is the default tab — "Portfolio Momentum" heading is unique to this tab
    await waitFor(() => expect(screen.getByText('Portfolio Momentum')).toBeInTheDocument());
    // "Warmup POV" labels only render inside portfolio cards, not in the featured bento
    expect(screen.getAllByText('Warmup POV').length).toBeGreaterThan(0);
  });

  it('switching to Startup News tab shows news articles with source links', async () => {
    signedIn();
    const user = userEvent.setup();
    renderPage();

    await waitFor(() =>
      expect(screen.getByRole('button', { name: /Read Full Digest/i })).toBeInTheDocument(),
    );
    await user.click(screen.getByRole('button', { name: /Read Full Digest/i }));
    await waitFor(() =>
      expect(screen.getByRole('button', { name: /Startup News/i })).toBeInTheDocument(),
    );
    await user.click(screen.getByRole('button', { name: /Startup News/i }));

    await waitFor(() => expect(screen.getByText(/Scripbox plans/i)).toBeInTheDocument());
    // "Project Garud" only appears in the Dhruva Space news article, not in the signals strip
    expect(screen.getByText(/Project Garud/i)).toBeInTheDocument();
  });

  it('collapse button closes the full digest section', async () => {
    signedIn();
    const user = userEvent.setup();
    renderPage();

    // Open
    await waitFor(() =>
      expect(screen.getByRole('button', { name: /Read Full Digest/i })).toBeInTheDocument(),
    );
    await user.click(screen.getByRole('button', { name: /Read Full Digest/i }));
    await waitFor(() => expect(screen.getByText('Portfolio Momentum')).toBeInTheDocument());

    // Close using the bottom collapse button
    const collapseBtn = screen.getAllByRole('button', { name: /Collapse digest/i })[0]!;
    await user.click(collapseBtn);

    await waitFor(() => expect(screen.queryByText('Portfolio Momentum')).not.toBeInTheDocument());
  });

  it('renders the archive section with "Past Editions" heading and filter chips', async () => {
    signedIn();
    renderPage();

    await waitFor(() => expect(screen.getByText('Past Editions')).toBeInTheDocument());
    expect(screen.getByRole('button', { name: /^All$/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /SpaceTech/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /AgriTech/i })).toBeInTheDocument();
  });

  it('shows all 6 archive editions by default', async () => {
    signedIn();
    renderPage();

    await waitFor(() => expect(screen.getByText('Past Editions')).toBeInTheDocument());
    // Each archive card has a "Read Edition" button
    expect(screen.getAllByRole('button', { name: /Read Edition/i })).toHaveLength(6);
  });

  it('sector filter chip hides non-matching archive editions', async () => {
    signedIn();
    const user = userEvent.setup();
    renderPage();

    await waitFor(() => expect(screen.getByText('Past Editions')).toBeInTheDocument());
    expect(screen.getAllByRole('button', { name: /Read Edition/i })).toHaveLength(6);

    // SpaceTech is only tagged on Issue 43 (Deep Tech)
    await user.click(screen.getByRole('button', { name: /SpaceTech/i }));

    await waitFor(() =>
      expect(screen.getAllByRole('button', { name: /Read Edition/i })).toHaveLength(1),
    );
  });

  it('clicking "Read Edition" opens the slide-over drawer', async () => {
    signedIn();
    const user = userEvent.setup();
    renderPage();

    await waitFor(() => expect(screen.getByText('Past Editions')).toBeInTheDocument());
    // Click the first archive card's button
    await user.click(screen.getAllByRole('button', { name: /Read Edition/i })[0]!);

    // Drawer shows close button
    await waitFor(() => expect(screen.getByRole('button', { name: /Close/i })).toBeInTheDocument());
  });

  it('closing the drawer with the X button removes it from view', async () => {
    signedIn();
    const user = userEvent.setup();
    renderPage();

    await waitFor(() => expect(screen.getByText('Past Editions')).toBeInTheDocument());
    await user.click(screen.getAllByRole('button', { name: /Read Edition/i })[0]!);
    await waitFor(() => expect(screen.getByRole('button', { name: /Close/i })).toBeInTheDocument());

    await user.click(screen.getByRole('button', { name: /Close/i }));

    await waitFor(() =>
      expect(screen.queryByRole('button', { name: /Close/i })).not.toBeInTheDocument(),
    );
  });

  it('admin user sees the "Admin digest console" link', async () => {
    signedInAsAdmin();
    renderPage();

    await waitFor(() => expect(screen.getByText(/Admin digest console/i)).toBeInTheDocument());
  });

  it('non-admin user does NOT see the "Admin digest console" link', async () => {
    signedIn();
    renderPage();

    // Wait for the page to fully render (archive section is always visible)
    await waitFor(() => expect(screen.getByText('Past Editions')).toBeInTheDocument());
    expect(screen.queryByText(/Admin digest console/i)).not.toBeInTheDocument();
  });
});
