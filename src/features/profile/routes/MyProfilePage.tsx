import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { User, Briefcase } from 'lucide-react';
import { ExecutionPanel } from '@/components/execution-panel';
import { FormField } from '@/components/forms/FormField';
import { Input } from '@/components/ui/input';
import { useCompleteProfile } from '@/features/onboarding/hooks/use-complete-profile';
import { useCreateLPProfile } from '@/features/onboarding/hooks/use-create-lp-profile';
import { useLPProfile } from '@/features/onboarding/hooks/use-lp-profile';
import {
  STARTUP_STAGES,
  zProfileUpdateRequest,
  zLPProfileRequest,
  type ProfileUpdateRequest,
  type ProfileUpdateResponse,
  type LPProfileRequest,
  type LPProfileResponse,
} from '@/features/onboarding/schemas';
import { useUser } from '@/auth/use-auth';
import { getMe } from '@/api/endpoints';
import { qk } from '@/api/query-keys';
import { useAuthStore } from '@/auth/auth-store';
import { profileFromMe } from '@/features/auth/lib/hydrate-session';
import { cn } from '@/lib/cn';

// ── MultiSelect (same as LPProfilePage) ──────────────────────────────────────

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

// ─────────────────────────────────────────────────────────────────────────────

export function MyProfilePage() {
  const user = useUser();
  const qc = useQueryClient();
  const isLP = user?.role === 'lp' || user?.role === 'potential_lp';

  const profileMutation = useCompleteProfile();
  const lpMutation = useCreateLPProfile();
  const { data: lpData } = useLPProfile();

  // Refresh auth store after basic profile save
  useEffect(() => {
    if (!profileMutation.isSuccess) return;
    let cancelled = false;
    (async () => {
      try {
        const me = await getMe();
        if (cancelled) return;
        useAuthStore.getState().setUser(profileFromMe(me));
        await qc.invalidateQueries({ queryKey: qk.auth.me });
        toast.success('Profile updated');
      } catch {
        // non-fatal — toast already confirms the save
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profileMutation.isSuccess]);

  // Invalidate LP profile cache after LP save
  useEffect(() => {
    if (!lpMutation.isSuccess) return;
    void qc.invalidateQueries({ queryKey: qk.onboarding.lpProfile });
    toast.success('Investment profile updated');
  }, [lpMutation.isSuccess, qc]);

  return (
    <div className="mx-auto max-w-2xl space-y-8 px-4 py-8">
      <div>
        <h1 className="text-2xl font-semibold text-ink-heading">My Profile</h1>
        <p className="mt-1 text-sm text-ink-muted">
          Update your details at any time. Changes apply immediately.
        </p>
      </div>

      {/* ── Basic profile ───────────────────────────────────────────────── */}
      <section>
        <div className="mb-4 flex items-center gap-2 text-ink-heading">
          <User className="h-4 w-4" aria-hidden />
          <h2 className="font-medium">Basic details</h2>
        </div>
        <ExecutionPanel<ProfileUpdateRequest, ProfileUpdateResponse>
          title=""
          description=""
          schema={zProfileUpdateRequest}
          defaultValues={{
            name: user?.name ?? '',
            email: user?.email ?? '',
            organisation: user?.organisation ?? '',
            designation: '',
            linkedin_url: '',
          }}
          mutation={profileMutation}
          submitLabel="Save details"
          renderForm={({ register, formState }) => (
            <div className="grid gap-4 md:grid-cols-2">
              <FormField
                label="Full name"
                htmlFor="my-profile-name"
                error={formState.errors.name?.message}
                className="md:col-span-2"
              >
                <Input id="my-profile-name" placeholder="Your name" {...register('name')} />
              </FormField>
              <FormField
                label="Email"
                htmlFor="my-profile-email"
                error={formState.errors.email?.message}
              >
                <Input
                  id="my-profile-email"
                  type="email"
                  placeholder="you@example.com"
                  {...register('email')}
                />
              </FormField>
              <FormField
                label="Organisation"
                htmlFor="my-profile-org"
                error={formState.errors.organisation?.message}
              >
                <Input
                  id="my-profile-org"
                  placeholder="Warmup Ventures"
                  {...register('organisation')}
                />
              </FormField>
              <FormField
                label="Designation"
                htmlFor="my-profile-designation"
                error={formState.errors.designation?.message}
              >
                <Input
                  id="my-profile-designation"
                  placeholder="Principal"
                  {...register('designation')}
                />
              </FormField>
              <FormField
                label="LinkedIn URL"
                htmlFor="my-profile-linkedin"
                error={formState.errors.linkedin_url?.message}
                className="md:col-span-2"
              >
                <Input
                  id="my-profile-linkedin"
                  placeholder="https://linkedin.com/in/…"
                  {...register('linkedin_url')}
                />
              </FormField>
            </div>
          )}
        />
      </section>

      {/* ── LP investment profile ────────────────────────────────────────── */}
      {isLP ? (
        <section>
          <div className="mb-4 flex items-center gap-2 text-ink-heading">
            <Briefcase className="h-4 w-4" aria-hidden />
            <h2 className="font-medium">Investment profile</h2>
          </div>
          <ExecutionPanel<LPProfileRequest, LPProfileResponse>
            title=""
            description=""
            schema={zLPProfileRequest}
            defaultValues={{
              fund_name: lpData?.fund_name ?? '',
              thesis: lpData?.thesis ?? '',
              preferred_sectors: (lpData?.preferred_sectors ??
                []) as (typeof SECTOR_OPTIONS)[number][],
              preferred_stages: (lpData?.preferred_stages ??
                []) as (typeof STARTUP_STAGES)[number][],
              geography: (lpData?.geography ?? ['IN']) as (typeof GEOGRAPHY_OPTIONS)[number][],
              aum_crore: lpData?.aum_crore ?? undefined,
              ticket_size_min_cr: lpData?.ticket_size_min_cr ?? undefined,
              ticket_size_max_cr: lpData?.ticket_size_max_cr ?? undefined,
              co_invest_interest: lpData?.co_invest_interest ?? false,
            }}
            mutation={lpMutation}
            submitLabel="Save investment profile"
            renderForm={({ register, watch, setValue, formState }) => {
              const sectors = watch('preferred_sectors') ?? [];
              const stages = watch('preferred_stages') ?? [];
              const geography = watch('geography') ?? [];
              return (
                <div className="grid gap-4 md:grid-cols-2">
                  <FormField
                    label="Fund name / Company name"
                    htmlFor="my-lp-fund"
                    className="md:col-span-2"
                  >
                    <Input id="my-lp-fund" placeholder="Acme Capital" {...register('fund_name')} />
                  </FormField>
                  <FormField label="AUM (₹ Cr)" htmlFor="my-lp-aum">
                    <Input
                      id="my-lp-aum"
                      type="number"
                      min="0"
                      step="0.5"
                      {...register('aum_crore', { valueAsNumber: true })}
                    />
                  </FormField>
                  <FormField label="Co-invest interest" htmlFor="my-lp-coinvest">
                    <label className="flex h-10 items-center gap-2 rounded-md border border-border bg-surface px-3 text-sm">
                      <input
                        id="my-lp-coinvest"
                        type="checkbox"
                        className="h-4 w-4 rounded border-border text-brand focus:ring-brand/30"
                        {...register('co_invest_interest')}
                      />
                      <span>Open to co-investing alongside the fund</span>
                    </label>
                  </FormField>
                  <FormField
                    label="Ticket size min (₹ Cr)"
                    htmlFor="my-lp-min"
                    error={formState.errors.ticket_size_min_cr?.message}
                  >
                    <Input
                      id="my-lp-min"
                      type="number"
                      min="0"
                      step="0.5"
                      {...register('ticket_size_min_cr', { valueAsNumber: true })}
                    />
                  </FormField>
                  <FormField
                    label="Ticket size max (₹ Cr)"
                    htmlFor="my-lp-max"
                    error={formState.errors.ticket_size_max_cr?.message}
                  >
                    <Input
                      id="my-lp-max"
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
                      onChange={(next) =>
                        setValue('preferred_sectors', next, { shouldDirty: true })
                      }
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
                  <FormField label="Thesis" htmlFor="my-lp-thesis" className="md:col-span-2">
                    <textarea
                      id="my-lp-thesis"
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
        </section>
      ) : null}
    </div>
  );
}
