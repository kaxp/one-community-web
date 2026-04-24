import type { HttpHandler } from 'msw';
import { authHandlers } from './msw-fixtures/auth-handlers';

export const handlers: HttpHandler[] = [...authHandlers];
