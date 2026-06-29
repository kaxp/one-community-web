import { useQuery } from '@tanstack/react-query';
import { getInvestorStartups, type InvestorStartupsArgs } from '@/api/endpoints';
import { qk } from '@/api/query-keys';
import type { ApiError } from '@/api/errors';
import type { InvestorStartupsResponse } from '@/features/admin/schemas';

export function useInvestorStartups(args: InvestorStartupsArgs = {}) {
  return useQuery<InvestorStartupsResponse, ApiError>({
    queryKey: qk.investor.startups(args),
    queryFn: () => getInvestorStartups(args),
    staleTime: 30_000,
  });
}
