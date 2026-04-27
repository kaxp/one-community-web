import { Suspense, type ReactNode } from 'react';

// Page-level loading shim used by every lazy route in `router.tsx`. Lives in
// its own file so `router.tsx` exports only the `router` const + the lazy
// route components (issues.md [I-5] — react-refresh/only-export-components).

export function PageLoader() {
  return <div className="p-8 text-sm text-ink-muted">Loading…</div>;
}

export function Susp({ children }: { children: ReactNode }) {
  return <Suspense fallback={<PageLoader />}>{children}</Suspense>;
}
