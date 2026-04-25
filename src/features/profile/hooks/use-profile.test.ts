import { describe, expect, it } from 'vitest';
import { waitFor } from '@testing-library/react';
import { renderHookWithProviders } from '@/test/hook-utils';
import { useProfile } from './use-profile';
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

describe('useProfile (interim §13 G1 path)', () => {
  it('composes a no-connection profile from the search hit', async () => {
    signedInAsLP();
    setMswProfileScenario('no_connection');

    const { result } = renderHookWithProviders(() => useProfile(TARGET_ID));

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    const data = result.current.data!;

    expect(data.user_id).toBe(TARGET_ID);
    expect(data.name).toBeTruthy();
    expect(data.contact).toBeNull();
    expect(data.viewer_interaction.has_requested).toBe(false);
    expect(data.viewer_interaction.has_connected).toBe(false);
    expect(data.can_request_connect).toBe(true);
  });

  it('marks the profile as pending when /connections/pending lists the target', async () => {
    signedInAsLP();
    setMswProfileScenario('pending');

    const { result } = renderHookWithProviders(() => useProfile(TARGET_ID));

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    const data = result.current.data!;

    expect(data.viewer_interaction.has_requested).toBe(true);
    expect(data.viewer_interaction.has_connected).toBe(false);
    expect(data.can_request_connect).toBe(false);
    expect(data.contact).toBeNull();
  });

  it('unlocks contact when /connections lists an accepted entry', async () => {
    signedInAsLP();
    setMswProfileScenario('accepted_with_contact');

    const { result } = renderHookWithProviders(() => useProfile(TARGET_ID));

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    const data = result.current.data!;

    expect(data.viewer_interaction.has_connected).toBe(true);
    expect(data.contact).not.toBeNull();
    expect(data.contact?.email).toBe('kapil@acme.ai');
    expect(data.contact?.phone).toBe('+919876543210');
    expect(data.can_request_connect).toBe(false);
  });
});
