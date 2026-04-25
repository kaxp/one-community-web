import type { HttpHandler } from 'msw';
import { authHandlers } from './msw-fixtures/auth-handlers';
import { searchHandlers } from './msw-fixtures/search-handlers';
import { adminConnectionsHandlers } from './msw-fixtures/admin-handlers';

export const handlers: HttpHandler[] = [
  ...authHandlers,
  ...searchHandlers,
  ...adminConnectionsHandlers,
];
