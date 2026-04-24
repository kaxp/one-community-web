import { useQuery } from '@tanstack/react-query';
import { getMe } from '@/api/endpoints';
import { qk } from '@/api/query-keys';
import { useAuthStore } from '@/auth/auth-store';

export function useMe(options?: { enabled?: boolean }) {
  const hasToken = useAuthStore((s) => (s.token && s.expiresAt ? s.expiresAt > Date.now() : false));
  return useQuery({
    queryKey: qk.auth.me,
    queryFn: getMe,
    enabled: options?.enabled ?? hasToken,
    staleTime: 5 * 60_000,
    gcTime: 15 * 60_000,
  });
}
