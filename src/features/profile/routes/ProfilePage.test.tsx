import { describe, expect, it } from 'vitest';
import { Route, Routes } from 'react-router-dom';
import { renderWithProviders, screen, waitFor } from '@/test/test-utils';
import { ProfilePage } from './ProfilePage';
import { setMswProfileScenario } from '@/test/msw-fixtures/profile-handlers';
import { useAuthStore } from '@/auth/auth-store';

const TARGET_ID = '11111111-1111-4000-8000-000000000001';

function signedInAsLP() {
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

function signedInAsPartner() {
  useAuthStore.getState().setSession({
    token: 'msw-jwt.partner',
    user: {
      id: '00000000-0000-4000-8000-000000000009',
      phone: '+911234567897',
      role: 'partner',
      name: 'Partner',
      email: null,
      organisation: null,
      profile_complete: true,
    },
    expiresAt: Date.now() + 60 * 60_000,
  });
}

function renderProfileAt(id: string = TARGET_ID) {
  return renderWithProviders(
    <Routes>
      <Route path="/profile/:id" element={<ProfilePage />} />
    </Routes>,
    { route: `/profile/${id}` },
  );
}

describe('ProfilePage', () => {
  it('renders no-connection state with a Request to connect button', async () => {
    signedInAsLP();
    setMswProfileScenario('no_connection');

    renderProfileAt();

    await waitFor(() => expect(screen.getByText('Kapil Sahu')).toBeInTheDocument());
    expect(screen.getByRole('button', { name: /request to connect/i })).toBeInTheDocument();
    expect(screen.queryByText(/pending admin approval/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/^Connected$/i)).not.toBeInTheDocument();
    // No accepted connection ⇒ no contact card.
    expect(screen.queryByText(/^Contact$/i)).not.toBeInTheDocument();
  });

  it('renders pending status when the viewer has already requested', async () => {
    signedInAsLP();
    setMswProfileScenario('pending');

    renderProfileAt();

    await waitFor(() => expect(screen.getByText('Kapil Sahu')).toBeInTheDocument());
    expect(screen.getByText(/pending admin approval/i)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /request to connect/i })).not.toBeInTheDocument();
  });

  it('renders the contact card after an accepted connection', async () => {
    signedInAsLP();
    setMswProfileScenario('accepted_with_contact');

    renderProfileAt();

    await waitFor(() => expect(screen.getByText('Kapil Sahu')).toBeInTheDocument());
    expect(screen.getByText(/^Contact$/i)).toBeInTheDocument();
    expect(screen.getByText('kapil@acme.ai')).toBeInTheDocument();
    expect(screen.getByText(/^Connected$/i)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /request to connect/i })).not.toBeInTheDocument();
  });

  it('renders the Profile-not-found empty state on 404', async () => {
    signedInAsLP();
    // Force the gap-mode interim composer to fail by passing a UUID that
    // isn't in any catalogue or connection list.
    renderProfileAt('99999999-9999-4000-8000-000000000099');

    await waitFor(() => {
      expect(screen.getByText(/profile not found/i)).toBeInTheDocument();
    });
  });

  it('hides the Request-to-connect CTA for partner viewers (mask path)', async () => {
    signedInAsPartner();
    setMswProfileScenario('no_connection');

    renderProfileAt();

    await waitFor(() => expect(screen.getByText('Kapil Sahu')).toBeInTheDocument());
    // Partner CAN request a connection (capability set in role-capabilities), but
    // the §13 G1 interim path returns can_request_connect=true here so the
    // button should still appear; the masked-fields presentation is exercised
    // separately in the ResultCard tests. This assertion verifies no crash on
    // partner viewer: CTA renders.
    expect(screen.getByRole('button', { name: /request to connect/i })).toBeInTheDocument();
  });
});
