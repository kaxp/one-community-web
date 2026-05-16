import { describe, expect, it } from 'vitest';
import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '@/test/test-utils';
import { MobileNavDrawer } from './MobileNavDrawer';
import { useAuthStore } from '@/auth/auth-store';
import { navForRole, resolvedLabel } from '@/lib/role-capabilities';

function signInAs(role: 'lp' | 'admin') {
  useAuthStore.getState().setSession({
    token: 'msw-jwt.test',
    user: {
      id: '00000000-0000-4000-8000-000000000004',
      phone: '+911234567892',
      role,
      name: 'Test',
      email: null,
      organisation: null,
      profile_complete: true,
    },
    expiresAt: Date.now() + 60 * 60_000,
  });
}

describe('MobileNavDrawer (CLAUDE.md §7.11 + PRD §10.1)', () => {
  it('exposes a hamburger button with an accessible name', () => {
    signInAs('lp');
    renderWithProviders(<MobileNavDrawer />);
    expect(screen.getByRole('button', { name: /open navigation/i })).toBeInTheDocument();
  });

  it('renders every NAV_ITEM accessible to the role inside the drawer once opened', async () => {
    signInAs('lp');
    const user = userEvent.setup();
    renderWithProviders(<MobileNavDrawer />);

    await user.click(screen.getByRole('button', { name: /open navigation/i }));

    const dialog = await screen.findByRole('dialog');
    const expected = navForRole('lp').map((i) => resolvedLabel(i, 'lp'));
    expect(expected.length).toBeGreaterThan(2);
    for (const label of expected) {
      expect(within(dialog).getByText(label)).toBeInTheDocument();
    }
  });

  it('shows admin-only items for an admin role', async () => {
    signInAs('admin');
    const user = userEvent.setup();
    renderWithProviders(<MobileNavDrawer />);

    await user.click(screen.getByRole('button', { name: /open navigation/i }));
    const dialog = await screen.findByRole('dialog');
    // TODO(kaxp): 'Admin home' menu removed — Dashboard tab now shows KPI content
    expect(within(dialog).queryByText('Admin home')).not.toBeInTheDocument();
    expect(within(dialog).getByText('Connection queue')).toBeInTheDocument();
    expect(within(dialog).getByText('Users')).toBeInTheDocument();
  });
});
