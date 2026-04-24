import { RouterProvider } from 'react-router-dom';
import { lazy, Suspense } from 'react';
import { Providers } from './providers';
import { AppErrorBoundary } from './error-boundary';
import { router } from './router';
import { env } from '@/lib/env';

const LazyDebugDock = lazy(() =>
  import('@/lib/debug/debug-dock').then((m) => ({ default: m.DebugDock })),
);

export function App() {
  const debugEnabled = !import.meta.env.PROD && env.DEBUG_PANEL;
  return (
    <AppErrorBoundary>
      <Providers>
        <RouterProvider router={router} />
        {debugEnabled ? (
          <Suspense fallback={null}>
            <LazyDebugDock />
          </Suspense>
        ) : null}
      </Providers>
    </AppErrorBoundary>
  );
}
