import { ExecutionPanel } from '@/components/execution-panel';
import { FormField } from '@/components/forms/FormField';
import { Input } from '@/components/ui/input';
import { useTracxnIngest } from '@/features/enrichment/hooks/use-tracxn-ingest';
import {
  zTracxnRequest,
  type TracxnRequest,
  type TracxnResponse,
} from '@/features/enrichment/schemas';

// PRD §7.15.1 — manual Tracxn ingest console. Backend is idempotent on
// (website_domain, company_name) and returns one of three actions; the
// toast copy varies per `action` per the prompt gotcha.
function tracxnToast(data: TracxnResponse, fallbackName: string): string {
  const name = fallbackName || 'startup';
  if (data.action === 'created') return `Added ${name}`;
  if (data.action === 'merged') {
    const n = data.updated_fields?.length ?? 0;
    return `Updated ${n} field${n === 1 ? '' : 's'} on ${name}`;
  }
  return `Already exists — no changes for ${name}`;
}

export function AdminTracxnPage() {
  const mutation = useTracxnIngest();

  return (
    <div className="flex flex-col gap-6">
      <header>
        <h1 className="text-3xl font-semibold text-ink-heading">Tracxn ingest</h1>
        <p className="text-sm text-ink-muted">
          Manual entry path for the Tracxn Chrome Extension data. Idempotent on website +
          company_name — duplicate submissions skip silently.
        </p>
      </header>

      <ExecutionPanel<TracxnRequest, TracxnResponse>
        title="Add or update a startup"
        description="Paste Tracxn fields below. Backend will create, merge, or skip based on website_domain + company_name match."
        schema={zTracxnRequest}
        defaultValues={{
          company_name: '',
          website_url: '',
          sector: '',
          stage: '',
          description: '',
          founders: '',
        }}
        mutation={mutation}
        submitLabel="Submit"
        onSuccessToast={(data) => tracxnToast(data, mutation.variables?.company_name ?? '')}
        renderForm={({ register, formState }) => (
          <div className="grid gap-4 md:grid-cols-2">
            <FormField
              label="Company name"
              htmlFor="tracxn-name"
              error={formState.errors.company_name?.message}
              className="md:col-span-2"
            >
              <Input
                id="tracxn-name"
                placeholder="Acme Technologies"
                {...register('company_name')}
              />
            </FormField>
            <FormField
              label="Website URL"
              htmlFor="tracxn-url"
              error={formState.errors.website_url?.message}
            >
              <Input id="tracxn-url" placeholder="https://acme.ai" {...register('website_url')} />
            </FormField>
            <FormField
              label="Sector"
              htmlFor="tracxn-sector"
              error={formState.errors.sector?.message}
            >
              <Input id="tracxn-sector" placeholder="fintech" {...register('sector')} />
            </FormField>
            <FormField label="Stage" htmlFor="tracxn-stage" error={formState.errors.stage?.message}>
              <Input id="tracxn-stage" placeholder="seed" {...register('stage')} />
            </FormField>
            <FormField
              label="Funding amount (Cr)"
              htmlFor="tracxn-funding"
              error={formState.errors.funding_amount_cr?.message}
            >
              <Input
                id="tracxn-funding"
                type="number"
                step="0.1"
                min={0}
                {...register('funding_amount_cr', {
                  setValueAs: (v) =>
                    v === '' || v === null || v === undefined ? undefined : Number(v),
                })}
              />
            </FormField>
            <FormField
              label="Founders"
              htmlFor="tracxn-founders"
              error={formState.errors.founders?.message}
              className="md:col-span-2"
            >
              <Input id="tracxn-founders" placeholder="Kapil Sahu" {...register('founders')} />
            </FormField>
            <FormField
              label="Description"
              htmlFor="tracxn-desc"
              error={formState.errors.description?.message}
              className="md:col-span-2"
            >
              <textarea
                id="tracxn-desc"
                rows={4}
                maxLength={5000}
                className="rounded-md border border-border bg-surface p-3 text-sm text-ink-heading focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
                placeholder="AI for compliance."
                {...register('description')}
              />
            </FormField>
          </div>
        )}
      />
    </div>
  );
}
