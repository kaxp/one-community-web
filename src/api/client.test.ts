import { describe, expect, it } from 'vitest';
import { http, HttpResponse } from 'msw';
import { server } from '@/test/msw-node';
import { apiClient } from './client';
import { ApiError } from './errors';
import { useAuthStore } from '@/auth/auth-store';

function seedSession() {
  useAuthStore.getState().setSession({
    token: 'msw-jwt.abc',
    user: {
      id: '00000000-0000-4000-8000-000000000001',
      phone: '+911234567892',
      role: 'lp',
      name: 'Test',
      email: null,
      organisation: null,
      profile_complete: true,
    },
    expiresAt: Date.now() + 60 * 60_000,
  });
}

describe('apiClient — session-termination policy (decisions.md P-17)', () => {
  it('does NOT clear the auth store when a 401 comes back', async () => {
    seedSession();
    server.use(
      http.get('*/api/v1/some/endpoint', () =>
        HttpResponse.json(
          { data: null, error: { code: 'token_expired', message: 'expired' } },
          { status: 401 },
        ),
      ),
    );

    await expect(apiClient.get('/some/endpoint')).rejects.toBeInstanceOf(ApiError);

    const after = useAuthStore.getState();
    expect(after.token).toBe('msw-jwt.abc');
    expect(after.user).not.toBeNull();
    expect(after.expiresAt).not.toBeNull();
  });

  it('does NOT clear on link_expired either', async () => {
    seedSession();
    server.use(
      http.get('*/api/v1/anything', () =>
        HttpResponse.json(
          { data: null, error: { code: 'link_expired', message: 'expired' } },
          { status: 401 },
        ),
      ),
    );
    await expect(apiClient.get('/anything')).rejects.toBeInstanceOf(ApiError);
    expect(useAuthStore.getState().token).toBe('msw-jwt.abc');
  });

  it('still surfaces the ApiError with the right code so callers can react', async () => {
    seedSession();
    server.use(
      http.get('*/api/v1/thing', () =>
        HttpResponse.json(
          { data: null, error: { code: 'rate_limit_exceeded', message: 'too many' } },
          { status: 429 },
        ),
      ),
    );
    await expect(apiClient.get('/thing')).rejects.toMatchObject({
      code: 'rate_limit_exceeded',
      status: 429,
    });
  });
});
