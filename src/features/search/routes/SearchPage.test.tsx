import { beforeEach, describe, expect, it } from 'vitest';
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '@/test/test-utils';
import { SearchPage } from './SearchPage';
import { useAuthStore } from '@/auth/auth-store';
import {
  setMswSearchScenario,
  getMswInteractionLogCount,
} from '@/test/msw-fixtures/search-handlers';
import { mintMswToken } from '@/test/msw-fixtures/auth-handlers';
import type { UserRole } from '@/types/enums';

beforeEach(() => {
  // Phase 2.5 added sessionStorage persistence for the conversation thread.
  // Reset between tests so prior turns don't render in subsequent cases.
  if (typeof window !== 'undefined') {
    window.sessionStorage.clear();
  }
});

function signInAsLP() {
  useAuthStore.getState().setSession({
    token: 'msw-jwt.test',
    user: {
      id: '00000000-0000-4000-8000-000000000004',
      phone: '+911234567892',
      role: 'lp',
      name: 'LP Test',
      email: null,
      organisation: null,
      profile_complete: true,
    },
    expiresAt: Date.now() + 60 * 60_000,
  });
}

function signInWithPhone(phone: string, role: UserRole, id: string) {
  useAuthStore.getState().setSession({
    token: mintMswToken(phone),
    user: {
      id,
      phone,
      role,
      name: role,
      email: null,
      organisation: null,
      profile_complete: true,
    },
    expiresAt: Date.now() + 60 * 60_000,
  });
}

async function typeAndSubmit(query: string) {
  const user = userEvent.setup();
  await user.type(screen.getByLabelText(/search query/i), query);
  await user.click(screen.getByRole('button', { name: /^search$/i }));
}

describe('SearchPage (PRD §7.4.1)', () => {
  it('renders the centred hero card when no query is entered', async () => {
    // After the conversational-search rebuild (Phase 1), the pristine state
    // shows the hero Card with title "Search the community" instead of the
    // older "Start a search" empty-state inside SearchResults — the
    // SearchResults block is only mounted once the user has submitted.
    signInAsLP();
    renderWithProviders(<SearchPage />);
    expect(await screen.findByText(/search the community/i)).toBeInTheDocument();
  });

  it('shows a startup result card on success', async () => {
    signInAsLP();
    setMswSearchScenario('startup');
    renderWithProviders(<SearchPage />);

    await typeAndSubmit('fintech');

    const grid = await screen.findByTestId('search-results');
    // "Acme Technologies" appears as both company_name (h3) and organisation (p).
    expect(within(grid).getAllByText('Acme Technologies').length).toBeGreaterThan(0);
    expect(within(grid).getByText('AI for compliance')).toBeInTheDocument();
  });

  it('renders the stage3 fallback banner when stage3_applied=false', async () => {
    signInAsLP();
    setMswSearchScenario('stage3_fallback');
    renderWithProviders(<SearchPage />);

    await typeAndSubmit('saas');

    expect(await screen.findByTestId('stage3-fallback-banner')).toBeInTheDocument();
  });

  it('shows the empty state when results are []', async () => {
    signInAsLP();
    setMswSearchScenario('empty');
    renderWithProviders(<SearchPage />);

    await typeAndSubmit('nothing matches');

    expect(await screen.findByText(/no matches for/i)).toBeInTheDocument();
  });

  it('surfaces a 429 rate-limit via the inline error', async () => {
    signInAsLP();
    setMswSearchScenario('rate_limit');
    renderWithProviders(<SearchPage />);

    await typeAndSubmit('fintech');

    expect(await screen.findByText(/too many requests/i)).toBeInTheDocument();
  });

  it('renders a non-partner viewer without locked placeholders even when fields are absent', async () => {
    signInAsLP();
    setMswSearchScenario('partner_masked');
    renderWithProviders(<SearchPage />);

    await typeAndSubmit('climate');

    const grid = await screen.findByTestId('search-results');
    expect(within(grid).getByText('Omega Labs')).toBeInTheDocument();
    // LP viewer (isMasked=false): missing fields stay hidden, no locked footer.
    expect(within(grid).queryByText(/asking:/i)).not.toBeInTheDocument();
    expect(within(grid).queryByText(/traction:/i)).not.toBeInTheDocument();
    expect(within(grid).queryByText(/Connect to unlock/i)).not.toBeInTheDocument();
  });

  it('renders Crunchbase-style locked footer + blur placeholders for partner viewers (P-21)', async () => {
    signInWithPhone('+911234567897', 'partner' as UserRole, '22222222-2222-4000-8000-000000000007');
    setMswSearchScenario('auto');
    renderWithProviders(<SearchPage />);

    await typeAndSubmit('fintech');

    const grid = await screen.findByTestId('search-results');
    // Visible (allow-listed) field renders normally.
    expect(within(grid).getByText('AI for compliance')).toBeInTheDocument();
    // Locked footer surfaces the escalation panel.
    expect(within(grid).getAllByText(/Connect to unlock/i).length).toBeGreaterThan(0);
    expect(
      within(grid).getAllByRole('button', { name: /request to connect/i }).length,
    ).toBeGreaterThan(0);
    // Per issues.md [I-4], the "Upgrade for full access" button is gated behind
    // VITE_PARTNER_UPGRADE_ENABLED. Default is false → the button must NOT render.
    expect(
      within(grid).queryByRole('button', { name: /upgrade for full access/i }),
    ).not.toBeInTheDocument();
    // Withheld values are NOT rendered as text — they appear as locked placeholders.
    expect(within(grid).queryByText(/3 pilot banks/i)).not.toBeInTheDocument();
    expect(within(grid).queryByText(/Strong match on sector/i)).not.toBeInTheDocument();
  });

  it('fires search_view interactions for visible cards', async () => {
    signInAsLP();
    setMswSearchScenario('startup');
    const start = getMswInteractionLogCount();
    renderWithProviders(<SearchPage />);

    await typeAndSubmit('fintech');
    await screen.findByTestId('search-results');

    await waitFor(() => {
      expect(getMswInteractionLogCount()).toBeGreaterThan(start);
    });
  });
});
