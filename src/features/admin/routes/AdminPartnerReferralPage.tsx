import { ExecutionPanel } from '@/components/execution-panel';
import { FormField } from '@/components/forms/FormField';
import { Input } from '@/components/ui/input';
import { usePartnerReferral } from '@/features/admin/hooks/use-partner-referral';
import {
  zPartnerReferralRequest,
  type PartnerReferralRequest,
  type PartnerReferralResponse,
} from '@/features/admin/schemas';

// PRD §7.12.6 — admin partner-referral broadcast. Single ExecutionPanel
// with sector + message + startup_name. The toast surfaces the count of
// partners that received the message.
export function AdminPartnerReferralPage() {
  const mutation = usePartnerReferral();

  return (
    <div className="flex flex-col gap-6">
      <header>
        <h1 className="text-3xl font-semibold text-ink-heading">Partner referral</h1>
        <p className="text-sm text-ink-muted">
          Broadcast a referral request to all partners that match a sector tag.
        </p>
      </header>

      <ExecutionPanel<PartnerReferralRequest, PartnerReferralResponse>
        title="Send a referral request"
        description="Used for one-off asks like “startup X needs senior Go engineers”. Goes out to every partner whose preferred sectors include this one."
        schema={zPartnerReferralRequest}
        defaultValues={{ sector: '', message: '', startup_name: '' }}
        mutation={mutation}
        submitLabel="Send referral"
        onSuccessToast={(data) =>
          `Notified ${data.partners_notified} partner${data.partners_notified === 1 ? '' : 's'}`
        }
        renderForm={({ register, formState }) => (
          <div className="flex flex-col gap-4">
            <FormField
              label="Sector"
              htmlFor="referral-sector"
              error={formState.errors.sector?.message}
              hint="e.g. fintech, defence, saas"
            >
              <Input
                id="referral-sector"
                placeholder="fintech"
                autoComplete="off"
                {...register('sector')}
              />
            </FormField>

            <FormField
              label="Startup name (optional)"
              htmlFor="referral-startup"
              error={formState.errors.startup_name?.message}
            >
              <Input
                id="referral-startup"
                placeholder="Acme Technologies"
                {...register('startup_name')}
              />
            </FormField>

            <FormField
              label="Message (optional)"
              htmlFor="referral-message"
              error={formState.errors.message?.message}
              hint="Up to 2000 characters"
            >
              <textarea
                id="referral-message"
                rows={5}
                maxLength={2000}
                className="rounded-md border border-border bg-surface p-3 text-sm text-ink-heading focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
                placeholder="Acme Technologies needs senior Go engineers — 5+ years experience."
                {...register('message')}
              />
            </FormField>
          </div>
        )}
      />
    </div>
  );
}
