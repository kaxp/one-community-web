import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { ExecutionPanel } from '@/components/execution-panel';
import { FormField } from '@/components/forms/FormField';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { BrandLogo } from '@/components/brand/BrandLogo';
import { useCreateLPProfile } from '@/features/onboarding/hooks/use-create-lp-profile';
import {
  STARTUP_STAGES,
  zLPProfileRequest,
  type LPProfileRequest,
  type LPProfileResponse,
} from '@/features/onboarding/schemas';
import { useUser } from '@/auth/use-auth';
import { getMe } from '@/api/endpoints';
import { qk } from '@/api/query-keys';
import { useAuthStore } from '@/auth/auth-store';
import { profileFromMe } from '@/features/auth/lib/hydrate-session';
import { defaultHomeFor } from '@/features/auth/lib/post-signin-navigate';
import { cn } from '@/lib/cn';

interface MultiSelectProps<T extends string> {
  options: readonly T[];
  value: T[];
  onChange(next: T[]): void;
  formatLabel?: (v: T) => string;
}

function MultiSelect<T extends string>({
  options,
  value,
  onChange,
  formatLabel,
}: MultiSelectProps<T>) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((opt) => {
        const selected = value.includes(opt);
        return (
          <button
            key={opt}
            type="button"
            className={cn(
              'rounded-full border px-3 py-1 text-xs font-medium',
              selected
                ? 'border-brand bg-brand/10 text-brand'
                : 'border-border bg-surface text-ink-body hover:bg-surface-muted',
            )}
            onClick={() => onChange(selected ? value.filter((v) => v !== opt) : [...value, opt])}
          >
            {formatLabel ? formatLabel(opt) : opt}
          </button>
        );
      })}
    </div>
  );
}

const SECTOR_OPTIONS = [
  'fintech',
  'saas',
  'healthtech',
  'climate',
  'consumer',
  'deeptech',
  'agritech',
  'edtech',
] as const;
const GEOGRAPHY_OPTIONS = ['IN', 'SEA', 'US', 'EU', 'ME'] as const;

export function LPProfilePage() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const user = useUser();
  const mutation = useCreateLPProfile();

  useEffect(() => {
    if (!mutation.isSuccess) return;
    let cancelled = false;
    (async () => {
      try {
        const me = await getMe();
        if (cancelled) return;
        useAuthStore.getState().setUser(profileFromMe(me));
        await qc.invalidateQueries({ queryKey: qk.auth.me });
        toast.success('Investment profile saved');
        navigate(defaultHomeFor(me.role), { replace: true });
      } catch {
        // surfaced by the ExecutionPanel's ErrorState
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mutation.isSuccess]);

  const skipForNow = () => {
    if (!user) return;
    navigate(defaultHomeFor(user.role), { replace: true });
  };

  return (
    <div className="flex min-h-screen items-start justify-center bg-background px-4 py-12">
      <div className="w-full max-w-2xl">
        <div className="mb-6 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <BrandLogo size={32} />
            <span className="font-semibold text-ink-heading">One Community</span>
          </div>
          <Button variant="ghost" size="sm" onClick={skipForNow}>
            Skip for now
          </Button>
        </div>

        <ExecutionPanel<LPProfileRequest, LPProfileResponse>
          title="Your investment profile"
          description="Tell us what you look for. This tailors your search, suggestions, and digest."
          schema={zLPProfileRequest}
          defaultValues={{
            fund_name: '',
            thesis: '',
            preferred_sectors: [],
            preferred_stages: [],
            geography: ['IN'],
            co_invest_interest: false,
          }}
          mutation={mutation}
          submitLabel="Save investment profile"
          secondaryActions={
            <Button type="button" variant="outline" onClick={skipForNow}>
              Skip for now
            </Button>
          }
          renderForm={({ register, watch, setValue, formState }) => {
            const sectors = watch('preferred_sectors') ?? [];
            const stages = watch('preferred_stages') ?? [];
            const geography = watch('geography') ?? [];

            return (
              <div className="grid gap-4 md:grid-cols-2">
                <FormField label="Fund name" htmlFor="lp-fund" className="md:col-span-2">
                  <Input id="lp-fund" placeholder="Acme Capital" {...register('fund_name')} />
                </FormField>
                <FormField label="AUM (₹ Cr)" htmlFor="lp-aum">
                  <Input
                    id="lp-aum"
                    type="number"
                    min="0"
                    step="0.5"
                    {...register('aum_crore', { valueAsNumber: true })}
                  />
                </FormField>
                <FormField label="Co-invest interest" htmlFor="lp-coinvest">
                  <label className="flex h-10 items-center gap-2 rounded-md border border-border bg-surface px-3 text-sm">
                    <input
                      id="lp-coinvest"
                      type="checkbox"
                      className="h-4 w-4 rounded border-border text-brand focus:ring-brand/30"
                      {...register('co_invest_interest')}
                    />
                    <span>Open to co-investing alongside the fund</span>
                  </label>
                </FormField>
                <FormField
                  label="Ticket size min (₹ Cr)"
                  htmlFor="lp-min"
                  error={formState.errors.ticket_size_min_cr?.message}
                >
                  <Input
                    id="lp-min"
                    type="number"
                    min="0"
                    step="0.5"
                    {...register('ticket_size_min_cr', { valueAsNumber: true })}
                  />
                </FormField>
                <FormField
                  label="Ticket size max (₹ Cr)"
                  htmlFor="lp-max"
                  error={formState.errors.ticket_size_max_cr?.message}
                >
                  <Input
                    id="lp-max"
                    type="number"
                    min="0"
                    step="0.5"
                    {...register('ticket_size_max_cr', { valueAsNumber: true })}
                  />
                </FormField>
                <FormField label="Sectors of interest" className="md:col-span-2">
                  <MultiSelect
                    options={SECTOR_OPTIONS}
                    value={sectors as (typeof SECTOR_OPTIONS)[number][]}
                    onChange={(next) => setValue('preferred_sectors', next, { shouldDirty: true })}
                  />
                </FormField>
                <FormField label="Preferred stages" className="md:col-span-2">
                  <MultiSelect
                    options={STARTUP_STAGES}
                    value={stages as (typeof STARTUP_STAGES)[number][]}
                    onChange={(next) => setValue('preferred_stages', next, { shouldDirty: true })}
                  />
                </FormField>
                <FormField label="Geography" className="md:col-span-2">
                  <MultiSelect
                    options={GEOGRAPHY_OPTIONS}
                    value={geography as (typeof GEOGRAPHY_OPTIONS)[number][]}
                    onChange={(next) => setValue('geography', next, { shouldDirty: true })}
                  />
                </FormField>
                <FormField label="Thesis" htmlFor="lp-thesis" className="md:col-span-2">
                  <textarea
                    id="lp-thesis"
                    rows={3}
                    className="flex w-full rounded-md border border-border bg-surface px-3 py-2 text-sm placeholder:text-ink-muted focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20"
                    placeholder="Early-stage B2B SaaS in India…"
                    {...register('thesis')}
                  />
                </FormField>
              </div>
            );
          }}
        />
      </div>
    </div>
  );
}
