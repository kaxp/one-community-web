import { ExecutionPanel } from '@/components/execution-panel';
import { FormField } from '@/components/forms/FormField';
import { Input } from '@/components/ui/input';
import { useSubmitMis } from '@/features/mis/hooks/use-submit-mis';
import {
  zMISFormInput,
  type MISFormInput,
  type MISPrefill,
  type MISSubmitResponse,
} from '@/features/mis/schemas';
import { formatINR } from '@/features/mis/lib/format-inr';

interface Props {
  period: string;
  prefill: MISPrefill;
  disabled?: boolean;
}

// PRD §7.9 — monthly MIS form. Period is read-only (server-derived current
// month). raw_data is built inside `useSubmitMis`'s buildMISRequest helper —
// users never type raw_data directly.
export function MISForm({ period, prefill, disabled = false }: Props) {
  const mutation = useSubmitMis(period);

  return (
    <ExecutionPanel<MISFormInput, MISSubmitResponse>
      title={`MIS for ${period}`}
      description={
        prefill
          ? `Prefilled with last month's values for reference. Edit any field to update for ${period}.`
          : `Submit your numbers for ${period}. All amounts are in INR rupees.`
      }
      schema={zMISFormInput}
      defaultValues={{
        revenue: prefill?.revenue ?? undefined,
        burn: prefill?.burn ?? undefined,
        runway_months: prefill?.runway_months ?? undefined,
        headcount: prefill?.headcount ?? undefined,
        highlights: prefill?.highlights ?? '',
        lowlights: prefill?.lowlights ?? '',
      }}
      mutation={mutation}
      submitLabel={disabled ? 'Already submitted' : `Submit MIS for ${period}`}
      onSuccessToast={(data) => `Submitted MIS for ${data.period}`}
      renderForm={({ register, formState }) => (
        <fieldset disabled={disabled} className="contents">
          <div className="grid gap-4 md:grid-cols-2">
            <FormField
              label="Revenue (₹)"
              htmlFor="mis-revenue"
              error={formState.errors.revenue?.message}
              hint={
                prefill?.revenue !== undefined
                  ? `Last month: ${formatINR(prefill?.revenue)}`
                  : 'INR rupees'
              }
            >
              <Input
                id="mis-revenue"
                type="number"
                min={0}
                step="1"
                inputMode="numeric"
                placeholder="2100000"
                {...register('revenue', { valueAsNumber: true })}
              />
            </FormField>
            <FormField
              label="Burn (₹)"
              htmlFor="mis-burn"
              error={formState.errors.burn?.message}
              hint={
                prefill?.burn !== undefined
                  ? `Last month: ${formatINR(prefill?.burn)}`
                  : 'INR rupees'
              }
            >
              <Input
                id="mis-burn"
                type="number"
                min={0}
                step="1"
                inputMode="numeric"
                placeholder="1600000"
                {...register('burn', { valueAsNumber: true })}
              />
            </FormField>
            <FormField
              label="Runway (months)"
              htmlFor="mis-runway"
              error={formState.errors.runway_months?.message}
              {...(prefill?.runway_months !== undefined && prefill?.runway_months !== null
                ? { hint: `Last month: ${prefill.runway_months}` }
                : {})}
            >
              <Input
                id="mis-runway"
                type="number"
                min={0}
                max={1200}
                step="1"
                inputMode="numeric"
                {...register('runway_months', { valueAsNumber: true })}
              />
            </FormField>
            <FormField
              label="Headcount"
              htmlFor="mis-headcount"
              error={formState.errors.headcount?.message}
              {...(prefill?.headcount !== undefined && prefill?.headcount !== null
                ? { hint: `Last month: ${prefill.headcount}` }
                : {})}
            >
              <Input
                id="mis-headcount"
                type="number"
                min={0}
                step="1"
                inputMode="numeric"
                {...register('headcount', { valueAsNumber: true })}
              />
            </FormField>
            <FormField
              label="Highlights"
              htmlFor="mis-highlights"
              error={formState.errors.highlights?.message}
              hint="What went well this month? (max 2000 chars)"
              className="md:col-span-2"
            >
              <textarea
                id="mis-highlights"
                rows={3}
                maxLength={2000}
                className="rounded-md border border-border bg-surface p-3 text-sm text-ink-heading focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
                placeholder="Closed Bank X as a pilot…"
                {...register('highlights')}
              />
            </FormField>
            <FormField
              label="Lowlights"
              htmlFor="mis-lowlights"
              error={formState.errors.lowlights?.message}
              hint="What didn't work? (max 2000 chars)"
              className="md:col-span-2"
            >
              <textarea
                id="mis-lowlights"
                rows={3}
                maxLength={2000}
                className="rounded-md border border-border bg-surface p-3 text-sm text-ink-heading focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
                placeholder="Churned Customer Y…"
                {...register('lowlights')}
              />
            </FormField>
          </div>
        </fieldset>
      )}
    />
  );
}
