import { ExecutionPanel } from '@/components/execution-panel';
import { FormField } from '@/components/forms/FormField';
import { Input } from '@/components/ui/input';
import { useUpsertStartupProfile } from '@/features/pitch/hooks/use-upsert-startup-profile';
import {
  zStartupProfileRequest,
  type StartupProfileRequest,
  type StartupProfileResponse,
} from '@/features/pitch/schemas';
import { STARTUP_STAGES } from '@/features/onboarding/schemas';
import { stageLabel } from '@/features/pitch/lib/stage-label';

interface Props {
  initial?: StartupProfileResponse | undefined;
}

// PRD §7.3.1 — startup profile form. Editable on existing profile, empty on
// 404. The form schema strips `undefined` keys before submit so the backend
// (which has no clear-field allowlist) doesn't see blanks.
export function StartupProfileForm({ initial }: Props) {
  const mutation = useUpsertStartupProfile();
  const isCreate = !initial;

  return (
    <ExecutionPanel<StartupProfileRequest, StartupProfileResponse>
      title={isCreate ? 'Create your startup profile' : 'Edit startup profile'}
      description={
        isCreate
          ? 'Tell us about your company so we can match you with the right LPs and partners.'
          : 'Keep these details current — they drive matchmaking and your search visibility.'
      }
      schema={zStartupProfileRequest}
      defaultValues={{
        name: initial?.name ?? '',
        tagline: initial?.tagline ?? '',
        sector: initial?.sector ?? '',
        stage: initial?.stage ?? undefined,
        website_url: initial?.website_url ?? '',
        description: initial?.description ?? '',
        founding_year: initial?.founding_year ?? undefined,
        team_size: initial?.team_size ?? undefined,
        revenue_model: initial?.revenue_model ?? '',
        traction: initial?.traction ?? '',
        ask_amount_cr: initial?.ask_amount_cr ?? undefined,
      }}
      mutation={mutation}
      submitLabel={isCreate ? 'Create profile' : 'Save changes'}
      onSuccessToast={() => 'Profile saved'}
      renderForm={({ register, formState }) => (
        <div className="grid gap-4 md:grid-cols-2">
          <FormField
            label="Company name"
            htmlFor="pitch-name"
            error={formState.errors.name?.message}
            className="md:col-span-2"
          >
            <Input id="pitch-name" placeholder="Acme Technologies Pvt Ltd" {...register('name')} />
          </FormField>
          <FormField
            label="Tagline"
            htmlFor="pitch-tagline"
            error={formState.errors.tagline?.message}
            className="md:col-span-2"
          >
            <Input id="pitch-tagline" placeholder="AI for compliance" {...register('tagline')} />
          </FormField>
          <FormField
            label="Sector"
            htmlFor="pitch-sector"
            error={formState.errors.sector?.message}
            hint="e.g. fintech, healthtech, climate"
          >
            <Input id="pitch-sector" placeholder="fintech" {...register('sector')} />
          </FormField>
          <FormField label="Stage" htmlFor="pitch-stage" error={formState.errors.stage?.message}>
            <select
              id="pitch-stage"
              className="h-10 rounded-md border border-border bg-surface px-3 text-sm text-ink-heading focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
              {...register('stage')}
            >
              <option value="">Select stage…</option>
              {STARTUP_STAGES.map((s) => (
                <option key={s} value={s}>
                  {stageLabel(s)}
                </option>
              ))}
            </select>
          </FormField>
          <FormField
            label="Website"
            htmlFor="pitch-website"
            error={formState.errors.website_url?.message}
          >
            <Input id="pitch-website" placeholder="https://acme.ai" {...register('website_url')} />
          </FormField>
          <FormField
            label="Founding year"
            htmlFor="pitch-year"
            error={formState.errors.founding_year?.message}
          >
            <Input
              id="pitch-year"
              type="number"
              min={1900}
              max={new Date().getFullYear()}
              {...register('founding_year', { valueAsNumber: true })}
            />
          </FormField>
          <FormField
            label="Team size"
            htmlFor="pitch-team"
            error={formState.errors.team_size?.message}
          >
            <Input
              id="pitch-team"
              type="number"
              min={0}
              {...register('team_size', { valueAsNumber: true })}
            />
          </FormField>
          <FormField
            label="Ask amount (₹ Cr)"
            htmlFor="pitch-ask"
            error={formState.errors.ask_amount_cr?.message}
            hint="In INR crore — e.g. 10 = ₹ 10 Cr"
          >
            <Input
              id="pitch-ask"
              type="number"
              min={0}
              step="0.01"
              {...register('ask_amount_cr', { valueAsNumber: true })}
            />
          </FormField>
          <FormField
            label="Revenue model"
            htmlFor="pitch-revenue"
            error={formState.errors.revenue_model?.message}
            className="md:col-span-2"
          >
            <Input
              id="pitch-revenue"
              placeholder="SaaS subscription"
              {...register('revenue_model')}
            />
          </FormField>
          <FormField
            label="Description"
            htmlFor="pitch-description"
            error={formState.errors.description?.message}
            className="md:col-span-2"
          >
            <textarea
              id="pitch-description"
              rows={4}
              className="rounded-md border border-border bg-surface p-3 text-sm text-ink-heading focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
              placeholder="What you build, who it's for, why now."
              {...register('description')}
            />
          </FormField>
          <FormField
            label="Traction"
            htmlFor="pitch-traction"
            error={formState.errors.traction?.message}
            className="md:col-span-2"
          >
            <textarea
              id="pitch-traction"
              rows={3}
              className="rounded-md border border-border bg-surface p-3 text-sm text-ink-heading focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
              placeholder="3 pilot banks, ₹ 2 Cr ARR…"
              {...register('traction')}
            />
          </FormField>
        </div>
      )}
    />
  );
}
