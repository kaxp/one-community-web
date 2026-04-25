import type { HttpHandler } from 'msw';
import { authHandlers } from './msw-fixtures/auth-handlers';
import { searchHandlers } from './msw-fixtures/search-handlers';
import { adminConnectionsHandlers } from './msw-fixtures/admin-handlers';
import { profileHandlers } from './msw-fixtures/profile-handlers';
import { connectionsHandlers } from './msw-fixtures/connections-handlers';
import { pitchHandlers } from './msw-fixtures/pitch-handlers';
import { misHandlers } from './msw-fixtures/mis-handlers';

// Order matters: admin-handlers register `PATCH /connections/:id/admin` and
// connections-handlers register `PATCH /connections/:id/respond`. Both paths
// have the same prefix; admin must register first so its more-specific
// `/admin` suffix isn't shadowed. (MSW v2 first-match wins.)
export const handlers: HttpHandler[] = [
  ...authHandlers,
  ...searchHandlers,
  ...adminConnectionsHandlers,
  ...connectionsHandlers,
  ...pitchHandlers,
  ...misHandlers,
  ...profileHandlers,
];
