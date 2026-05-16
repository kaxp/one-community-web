import { describe, expect, it } from 'vitest';
import { http, HttpResponse } from 'msw';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import { server } from '@/test/msw-node';
import { ProfileGate } from './profile-gate';
import { useAuthStore } from './auth-store';

function seedSession(profileComplete = true) {
  useAuthStore.getState().setSession({
    token: 'msw-jwt.abc',
    user: {
      id: '00000000-0000-4000-8000-000000000004',
      phone: '+911234567892',
      role: 'lp',
      name: 'LP Test',
      email: 'lp@test.com',
      organisation: null,
      profile_complete: profileComplete,
    },
    expiresAt: Date.now() + 60 * 60_000,
  });
}

function renderGate() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  });
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={['/dashboard']}>
        <Routes>
          <Route element={<ProfileGate />}>
            <Route path="/dashboard" element={<div>dashboard ok</div>} />
          </Route>
          <Route path="/onboarding/profile" element={<div>onboarding shown</div>} />
          <Route path="/signin" element={<div>SHOULD NOT SEE</div>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('ProfileGate — session-termination policy (decisions.md P-17)', () => {
  it('keeps the session and stays on /dashboard when /auth/me returns 401', async () => {
    seedSession(true);
    server.use(
      http.get('*/api/v1/auth/me', () =>
        HttpResponse.json(
          { data: null, error: { code: 'token_expired', message: 'expired' } },
          { status: 401 },
        ),
      ),
    );

    renderGate();

    // The persisted user snapshot has profile_complete=true, so the dashboard renders.
    expect(await screen.findByText('dashboard ok')).toBeInTheDocument();

    // No redirect to /signin happened.
    expect(screen.queryByText('SHOULD NOT SEE')).not.toBeInTheDocument();

    // Auth store remains populated.
    const state = useAuthStore.getState();
    expect(state.token).toBe('msw-jwt.abc');
    expect(state.user?.phone).toBe('+911234567892');
  });

  // TODO(kaxp): Profile completion redirect is bypassed for now.
  // All users (including profile_complete=false) land on /dashboard.
  it('stays on /dashboard even when profile_complete is false (TODO kaxp: redirect bypassed)', async () => {
    seedSession(false);
    renderGate();

    await waitFor(() => {
      expect(screen.getByText('dashboard ok')).toBeInTheDocument();
    });
    expect(screen.queryByText('onboarding shown')).not.toBeInTheDocument();
  });
});
