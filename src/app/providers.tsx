import { QueryCache, QueryClient, QueryClientProvider, MutationCache } from '@tanstack/react-query';
import { useState, type ReactNode } from 'react';
import { toast } from 'sonner';
import { ApiError } from '@/api/errors';
import { getReporter } from '@/lib/error-reporter';
import { Toaster } from '@/components/toaster';

function makeQueryClient(): QueryClient {
  return new QueryClient({
    queryCache: new QueryCache({
      // Global backstop: any query that errors without a component-level
      // handler (via isError + <ErrorState>) will still surface a toast.
      // Components that show their own inline ErrorState can suppress the
      // toast by setting `meta: { suppressGlobalErrorToast: true }` on the
      // query options.
      onError(error, query) {
        if (query.meta?.suppressGlobalErrorToast) return;
        const msg =
          error instanceof ApiError ? error.userMessage : 'Something went wrong. Please try again.';
        toast.error(msg);
        getReporter().captureException(error, { queryKey: query.queryKey });
      },
    }),
    mutationCache: new MutationCache({
      // Backstop for any mutation that doesn't define its own onError handler.
      // Mutations that handle errors themselves should pass
      // `meta: { suppressGlobalErrorToast: true }` in useMutation options.
      onError(error, _vars, _ctx, mutation) {
        if (mutation.meta?.suppressGlobalErrorToast) return;
        // Per-mutation onError callbacks are still invoked by TanStack Query
        // before this cache-level handler, so we only fire here when the
        // mutation has NO per-instance callback (i.e. bare mutate() calls).
        // For mutations that DO handle errors, the component should set the
        // suppressGlobalErrorToast meta flag to avoid double-toasting.
        if (mutation.options.onError) return;
        const msg =
          error instanceof ApiError ? error.userMessage : 'Something went wrong. Please try again.';
        toast.error(msg);
        getReporter().captureException(error);
      },
    }),
    defaultOptions: {
      queries: {
        staleTime: 60_000,
        gcTime: 5 * 60_000,
        refetchOnWindowFocus: true,
        refetchOnReconnect: true,
        retry: (failureCount, error) => {
          if (error instanceof ApiError && error.status >= 400 && error.status < 500) {
            return false;
          }
          return failureCount < 2;
        },
      },
      mutations: {
        retry: false,
      },
    },
  });
}

export function Providers({ children }: { children: ReactNode }) {
  const [client] = useState(() => makeQueryClient());
  return (
    <QueryClientProvider client={client}>
      {children}
      <Toaster />
    </QueryClientProvider>
  );
}
