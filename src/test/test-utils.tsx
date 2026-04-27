import { render, type RenderOptions } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import type { ReactElement, ReactNode } from 'react';

interface Options extends Omit<RenderOptions, 'wrapper'> {
  route?: string;
}

export function renderWithProviders(ui: ReactElement, { route = '/', ...opts }: Options = {}) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  function Wrapper({ children }: { children: ReactNode }) {
    return (
      <QueryClientProvider client={client}>
        <MemoryRouter
          initialEntries={[route]}
          future={{ v7_relativeSplatPath: true, v7_startTransition: true }}
        >
          {children}
        </MemoryRouter>
      </QueryClientProvider>
    );
  }
  return render(ui, { wrapper: Wrapper, ...opts });
}

// This file is loaded only inside Vitest (never by the Vite dev server), so the
// react-refresh fast-refresh boundary rule does not apply (issues.md [I-5]).
// eslint-disable-next-line react-refresh/only-export-components
export * from '@testing-library/react';
