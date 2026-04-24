import type { HttpHandler } from 'msw';

// Stage 1: empty handlers stub. Feature sessions append their mocks here.
// Pattern (copy into feature PRs):
//
//   import { http, HttpResponse } from 'msw';
//   export const handlers: HttpHandler[] = [
//     http.get('*/api/v1/auth/me', () => HttpResponse.json({ data: { ... }, error: null })),
//   ];

export const handlers: HttpHandler[] = [];
