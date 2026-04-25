import '@testing-library/jest-dom/vitest';
import { afterAll, afterEach, beforeAll } from 'vitest';
import { server } from './msw-node';
import { resetMswAuthState } from './msw-fixtures/auth-handlers';
import { resetMswSearchState } from './msw-fixtures/search-handlers';
import { useAuthStore } from '@/auth/auth-store';

beforeAll(() => server.listen({ onUnhandledRequest: 'bypass' }));
afterEach(() => {
  server.resetHandlers();
  resetMswAuthState();
  resetMswSearchState();
  useAuthStore.getState().clear();
  if (typeof localStorage?.clear === 'function') localStorage.clear();
});
afterAll(() => server.close());
