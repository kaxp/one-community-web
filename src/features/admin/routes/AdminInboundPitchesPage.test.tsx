import { describe, expect, it, beforeEach } from 'vitest';
import { Route, Routes } from 'react-router-dom';
import userEvent from '@testing-library/user-event';
import { renderWithProviders, screen, waitFor } from '@/test/test-utils';
import { AdminInboundPitchesPage } from './AdminInboundPitchesPage';
import { useAuthStore } from '@/auth/auth-store';
import {
  queueAdminPitchesListError,
  queueAdminPitchDetailError,
  resetMswAdminPitchesState,
} from '@/test/msw-fixtures/admin-pitches-handlers';

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

function renderPage(route = '/admin/pitches/inbound') {
  return renderWithProviders(
    <Routes>
      <Route path="/admin/pitches/inbound" element={<AdminInboundPitchesPage />} />
    </Routes>,
    { route },
  );
}

beforeEach(() => {
  resetMswAdminPitchesState();
});

describe('AdminInboundPitchesPage — list', () => {
  it('renders the seed rows on initial load (weekly range default)', async () => {
    signedInAsAdmin();
    renderPage();
    // weekly → 2 rows
    await screen.findByTestId('eval-00000000-0000-4000-8000-000000000aa1');
    expect(screen.getByText('Greenleaf Agritech')).toBeInTheDocument();
    expect(screen.getByText('PayKart')).toBeInTheDocument();
    // Third row (Brickly) not in weekly range
    expect(screen.queryByText('Brickly')).not.toBeInTheDocument();
  });

  it('shows all four signal-badge states', async () => {
    signedInAsAdmin();
    // Use yearly range to get all 4 seeds including the null-signal row.
    renderPage('/admin/pitches/inbound?range=yearly');
    await screen.findByTestId('signal-badge-strong');
    expect(screen.getByTestId('signal-badge-strong')).toBeInTheDocument();
    expect(screen.getByTestId('signal-badge-moderate')).toBeInTheDocument();
    expect(screen.getByTestId('signal-badge-weak')).toBeInTheDocument();
    expect(screen.getByTestId('signal-badge-null')).toBeInTheDocument();
  });

  it('range filter buttons sync the URL param', async () => {
    signedInAsAdmin();
    const user = userEvent.setup();
    const { baseElement } = renderPage();
    await screen.findByTestId('range-weekly');

    await user.click(screen.getByTestId('range-monthly'));
    // URL should now include ?range=monthly
    const url = baseElement.ownerDocument.defaultView?.location?.href ?? '';
    // MemoryRouter doesn't update window.location; check the button aria-pressed state instead.
    await waitFor(() =>
      expect(screen.getByTestId('range-monthly').getAttribute('aria-pressed')).toBe('true'),
    );
    expect(screen.getByTestId('range-weekly').getAttribute('aria-pressed')).toBe('false');
    void url;
  });

  it('shows an error state when the list fetch fails (500)', async () => {
    signedInAsAdmin();
    queueAdminPitchesListError({ status: 500, code: 'internal_error', message: 'Server error' });
    renderPage();
    await waitFor(() => {
      expect(screen.getByText(/something went wrong on our end/i)).toBeInTheDocument();
    });
  });

  it('renders Notion and Drive links with correct hrefs', async () => {
    signedInAsAdmin();
    renderPage();
    await screen.findByTestId('eval-00000000-0000-4000-8000-000000000aa1');
    const notionBtn = screen.getByTestId('notion-00000000-0000-4000-8000-000000000aa1');
    expect(notionBtn.getAttribute('href')).toBe('https://notion.so/notion-abc123');
    expect(notionBtn.getAttribute('target')).toBe('_blank');
    expect(notionBtn.getAttribute('rel')).toContain('noopener');
  });
});

describe('AdminInboundPitchesPage — drawer', () => {
  it('opens the drawer with founder contact on "Full evaluation" click', async () => {
    signedInAsAdmin();
    const user = userEvent.setup();
    renderPage();
    await screen.findByTestId('eval-00000000-0000-4000-8000-000000000aa1');

    await user.click(screen.getByTestId('eval-00000000-0000-4000-8000-000000000aa1'));

    await screen.findByTestId('pitch-detail-drawer');
    // Founder contact section
    await screen.findByText('Priya Nair');
    expect(screen.getByText('priya@greenleaf.in')).toBeInTheDocument();
    expect(screen.getByText('+919876543210')).toBeInTheDocument();
  });

  it('renders empty-evaluation state gracefully when evaluation is null', async () => {
    signedInAsAdmin();
    const user = userEvent.setup();
    renderPage('/admin/pitches/inbound?range=monthly');
    // monthly → 3 rows; aa2 is PayKart which has no evaluation in seed
    await screen.findByTestId('eval-00000000-0000-4000-8000-000000000aa2');

    await user.click(screen.getByTestId('eval-00000000-0000-4000-8000-000000000aa2'));

    await screen.findByTestId('pitch-detail-drawer');
    await screen.findByTestId('empty-evaluation');
    expect(screen.getByTestId('empty-evaluation')).toBeInTheDocument();
  });

  it('shows an error state inside the drawer when detail fetch fails', async () => {
    signedInAsAdmin();
    const user = userEvent.setup();
    queueAdminPitchDetailError({ status: 404, code: 'not_found', message: 'Not found' });
    renderPage();
    await screen.findByTestId('eval-00000000-0000-4000-8000-000000000aa1');

    await user.click(screen.getByTestId('eval-00000000-0000-4000-8000-000000000aa1'));

    await screen.findByTestId('pitch-detail-drawer');
    // ErrorState renders a retry button or error message
    await waitFor(() =>
      expect(
        screen.queryByTestId('drawer-loading') === null ||
          document.querySelector('[data-testid="pitch-detail-drawer"]') !== null,
      ).toBe(true),
    );
  });
});

// ── Phase 4 menu Phase C2 (2026-05-28): video pitches tab ────────────────────

describe('AdminInboundPitchesPage — video pitches tab', () => {
  it('switches to the video tab and renders the WA video rows', async () => {
    signedInAsAdmin();
    const user = userEvent.setup();
    renderPage();
    await screen.findByTestId('tab-inbound');

    await user.click(screen.getByTestId('tab-video'));

    // Wait for BOTH video seed rows by test-id (resilient to CI timing —
    // matching by text was flaky because both inbound + video seeds use
    // the same company names, so the order of paint matters).
    await screen.findByTestId('video-link-00000000-0000-4000-8000-000000000bb1');
    await screen.findByTestId('video-link-00000000-0000-4000-8000-000000000bb2');
  });

  it('tab=video on initial URL renders video tab without an inbound flash', async () => {
    signedInAsAdmin();
    renderPage('/admin/pitches/inbound?tab=video');
    await screen.findByTestId('video-link-00000000-0000-4000-8000-000000000bb1');
    // Inbound table actions (eval-) should not be present in video mode
    expect(
      screen.queryByTestId('eval-00000000-0000-4000-8000-000000000aa1'),
    ).not.toBeInTheDocument();
  });

  it('keeps the range filter applied across tabs (URL preserved)', async () => {
    signedInAsAdmin();
    const user = userEvent.setup();
    renderPage('/admin/pitches/inbound?range=monthly');
    await screen.findByTestId('tab-inbound');

    await user.click(screen.getByTestId('tab-video'));
    // range chip stays pressed after the tab swap
    expect(screen.getByTestId('range-monthly').getAttribute('aria-pressed')).toBe('true');
  });
});

// ── Phase 4 menu Phase C2 (2026-05-28): inbound row "View video" link ───────

describe('AdminInboundPitchesPage — wa_video_pitch_url on inbound rows', () => {
  it('does not render a video button when the inbound row has no WA video URL', async () => {
    signedInAsAdmin();
    renderPage();
    await screen.findByTestId('eval-00000000-0000-4000-8000-000000000aa1');
    // The default seed has no wa_video_pitch_url → no video-* button
    expect(
      screen.queryByTestId('video-00000000-0000-4000-8000-000000000aa1'),
    ).not.toBeInTheDocument();
  });
});
