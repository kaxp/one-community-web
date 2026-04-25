import { describe, expect, it } from 'vitest';
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
  it('renders the empty CTA when no query is entered', async () => {
    signInAsLP();
    renderWithProviders(<SearchPage />);
    expect(await screen.findByText(/start a search/i)).toBeInTheDocument();
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
    expect(
      within(grid).getAllByRole('button', { name: /upgrade for full access/i }).length,
    ).toBeGreaterThan(0);
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
