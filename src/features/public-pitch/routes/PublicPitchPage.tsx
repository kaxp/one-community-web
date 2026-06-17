import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useForm, useFieldArray, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { CheckCircle2, Loader2, PlusCircle, Trash2 } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { FormField } from '@/components/forms/FormField';
import { BrandLogo } from '@/components/brand/BrandLogo';
import { submitPublicPitch } from '@/api/public/pitch';
import {
  zPublicPitchForm,
  PITCH_STAGES,
  PITCH_STAGE_LABELS,
  COUNTRY_CODES,
  toApiPayload,
  type PublicPitchFormValues,
  type PublicPitchSuccess,
} from '@/features/public-pitch/schemas';

const SUPPORT_EMAIL = 'pitch@warmupventures.com';

const INPUT_CLASS =
  'flex h-10 w-full rounded-md border border-border bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-ink-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50';

// ── Success / special states ──────────────────────────────────────────────────

function SuccessCard({ data }: { data: PublicPitchSuccess }) {
  const isDuplicate = data.status === 'duplicate';
  return (
    <Card className="max-w-lg" data-testid="pitch-success-card">
      <CardHeader className="flex flex-row items-start gap-3 space-y-0">
        <CheckCircle2 className="mt-0.5 h-6 w-6 flex-none text-success" aria-hidden />
        <div>
          <CardTitle>{isDuplicate ? 'Already on file' : 'Pitch received!'}</CardTitle>
          <CardDescription>
            {isDuplicate
              ? "We already have your pitch on file. We'll be in touch shortly."
              : "Thanks — we'll review and reach out within 5 business days."}
          </CardDescription>
        </div>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <p className="text-sm text-ink-body">
          {isDuplicate ? 'Reference: ' : 'Quote this reference if you email us: '}
          <span className="font-mono font-semibold text-ink-heading" data-testid="pitch-id">
            {data.pitch_id}
          </span>
        </p>
        <p className="text-sm text-ink-muted">
          Have questions?{' '}
          <a href={`mailto:${SUPPORT_EMAIL}`} className="font-medium text-brand hover:underline">
            Email {SUPPORT_EMAIL}
          </a>
        </p>
      </CardContent>
    </Card>
  );
}

function RateLimitedCard() {
  return (
    <Card className="max-w-lg border-warning/30 bg-warning/5" data-testid="pitch-rate-limited">
      <CardHeader>
        <CardTitle>Submission limit reached</CardTitle>
        <CardDescription>
          You have hit the limit of 3 submissions per hour from this IP address.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-ink-body">
          Please try again in an hour, or email us directly at{' '}
          <a href={`mailto:${SUPPORT_EMAIL}`} className="font-medium text-brand hover:underline">
            {SUPPORT_EMAIL}
          </a>
          .
        </p>
      </CardContent>
    </Card>
  );
}

// ── Section wrapper ───────────────────────────────────────────────────────────

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <fieldset className="flex flex-col gap-4">
      <legend className="mb-1 text-sm font-semibold uppercase tracking-wide text-ink-muted">
        {title}
      </legend>
      {children}
    </fieldset>
  );
}

// ── Main form ─────────────────────────────────────────────────────────────────

function PitchForm({ onSuccess }: { onSuccess: (data: PublicPitchSuccess) => void }) {
  const [serverError, setServerError] = useState<string | null>(null);
  const [rateLimited, setRateLimited] = useState(false);

  const {
    register,
    handleSubmit,
    control,
    setValue,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<PublicPitchFormValues>({
    resolver: zodResolver(zPublicPitchForm),
    defaultValues: {
      phone_country_code: '+91',
      additional_founders: [],
    },
  });

  const {
    fields: coFounderFields,
    append,
    remove,
  } = useFieldArray({
    control,
    name: 'additional_founders',
  });

  const hasRaised = useWatch({ control, name: 'has_raised_funds' });
  const primaryPhoneCC = useWatch({ control, name: 'phone_country_code' }) ?? '+91';

  const onSubmit = handleSubmit(async (values) => {
    setServerError(null);
    const payload = toApiPayload(values);
    const result = await submitPublicPitch(payload);
    if (result.kind === 'success') {
      onSuccess(result.data);
    } else if (result.kind === 'rate_limited') {
      setRateLimited(true);
    } else if (result.kind === 'validation_error') {
      for (const [field, msg] of Object.entries(result.fieldErrors)) {
        setError(field as keyof PublicPitchFormValues, { message: msg });
      }
    } else {
      setServerError(result.message);
    }
  });

  if (rateLimited) return <RateLimitedCard />;

  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-col gap-10" data-testid="pitch-form">
      {/* ── 1. Company details ── */}
      <Section title="Company details">
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField
            label="Company name *"
            htmlFor="company_name"
            error={errors.company_name?.message}
          >
            <Input
              id="company_name"
              {...register('company_name')}
              data-testid="field-company_name"
            />
          </FormField>
          <FormField label="City" htmlFor="city" error={errors.city?.message}>
            <Input id="city" placeholder="e.g. Bengaluru" {...register('city')} />
          </FormField>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <FormField
            label="Sector / industry *"
            htmlFor="sector"
            error={errors.sector?.message}
            hint="e.g. Fintech, Agritech, SaaS"
          >
            <Input id="sector" {...register('sector')} data-testid="field-sector" />
          </FormField>
          <FormField label="Stage *" htmlFor="stage" error={errors.stage?.message}>
            <select
              id="stage"
              {...register('stage')}
              className={INPUT_CLASS}
              data-testid="field-stage"
            >
              <option value="">Select stage</option>
              {PITCH_STAGES.map((s) => (
                <option key={s} value={s}>
                  {PITCH_STAGE_LABELS[s]}
                </option>
              ))}
            </select>
          </FormField>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <FormField
            label="Founded year *"
            htmlFor="founding_year"
            error={errors.founding_year?.message}
          >
            <Input
              id="founding_year"
              type="number"
              min={1900}
              max={new Date().getFullYear()}
              {...register('founding_year', {
                setValueAs: (v: string) => (v === '' ? undefined : parseInt(v, 10)),
              })}
              data-testid="field-founding_year"
            />
          </FormField>
          <FormField label="Team size" htmlFor="team_size" error={errors.team_size?.message}>
            <Input
              id="team_size"
              type="number"
              min={1}
              {...register('team_size', {
                setValueAs: (v: string) => (v === '' ? undefined : parseInt(v, 10)),
              })}
            />
          </FormField>
        </div>

        <FormField
          label="One-line tagline *"
          htmlFor="tagline"
          error={errors.tagline?.message}
          hint="Max 280 characters"
        >
          <Input id="tagline" {...register('tagline')} data-testid="field-tagline" />
        </FormField>

        <FormField label="Description *" htmlFor="description" error={errors.description?.message}>
          <textarea
            id="description"
            rows={5}
            className={`${INPUT_CLASS} h-auto`}
            placeholder="A brief description about the startup and the problem you are solving"
            {...register('description')}
            data-testid="field-description"
          />
        </FormField>

        <div className="grid gap-4 sm:grid-cols-2">
          <FormField
            label="Website or Mobile App link"
            htmlFor="website_url"
            error={errors.website_url?.message}
          >
            <Input
              id="website_url"
              type="url"
              placeholder="https://"
              {...register('website_url')}
            />
          </FormField>
          <FormField
            label="Pitch deck URL"
            htmlFor="deck_url"
            error={errors.deck_url?.message}
            hint="Google Drive, Dropbox, etc."
          >
            <Input id="deck_url" type="url" placeholder="https://" {...register('deck_url')} />
          </FormField>
        </div>

        <FormField
          label="Company LinkedIn"
          htmlFor="company_linkedin_url"
          error={errors.company_linkedin_url?.message}
        >
          <Input
            id="company_linkedin_url"
            type="url"
            placeholder="https://linkedin.com/company/…"
            {...register('company_linkedin_url')}
          />
        </FormField>
      </Section>

      {/* ── 2. Founder details ── */}
      <Section title="Founder details">
        <p className="text-xs text-ink-muted">Primary founder — add co-founders below if needed.</p>

        <div className="grid gap-4 sm:grid-cols-2">
          <FormField
            label="Your name *"
            htmlFor="founder_name"
            error={errors.founder_name?.message}
          >
            <Input
              id="founder_name"
              {...register('founder_name')}
              data-testid="field-founder_name"
            />
          </FormField>
          <FormField label="Email *" htmlFor="email" error={errors.email?.message}>
            <Input
              id="email"
              type="email"
              inputMode="email"
              {...register('email')}
              data-testid="field-email"
            />
          </FormField>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <FormField label="Phone" htmlFor="phone_number" error={errors.phone_number?.message}>
            <div className="flex gap-2">
              <select
                value={primaryPhoneCC}
                onChange={(e) => setValue('phone_country_code', e.target.value)}
                className={`${INPUT_CLASS} w-36 flex-none`}
                aria-label="Country code"
              >
                {COUNTRY_CODES.map((c) => (
                  <option key={c.code} value={c.code}>
                    {c.label}
                  </option>
                ))}
              </select>
              <Input
                id="phone_number"
                type="tel"
                inputMode="tel"
                placeholder="98765 43210"
                {...register('phone_number')}
                className="flex-1"
              />
            </div>
          </FormField>
          <FormField
            label="LinkedIn"
            htmlFor="founder_linkedin_url"
            error={errors.founder_linkedin_url?.message}
          >
            <Input
              id="founder_linkedin_url"
              type="url"
              placeholder="https://linkedin.com/in/…"
              {...register('founder_linkedin_url')}
            />
          </FormField>
        </div>

        {/* Co-founders */}
        {coFounderFields.map((field, idx) => (
          <div
            key={field.id}
            className="rounded-lg border border-border bg-muted/30 p-4 flex flex-col gap-3"
          >
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-ink-heading">Co-founder {idx + 1}</span>
              <button
                type="button"
                onClick={() => remove(idx)}
                className="text-ink-muted hover:text-error transition-colors"
                aria-label={`Remove co-founder ${idx + 1}`}
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <FormField
                label="Name *"
                htmlFor={`additional_founders.${idx}.name`}
                error={errors.additional_founders?.[idx]?.name?.message}
              >
                <Input
                  id={`additional_founders.${idx}.name`}
                  {...register(`additional_founders.${idx}.name`)}
                />
              </FormField>
              <FormField
                label="Email"
                htmlFor={`additional_founders.${idx}.email`}
                error={errors.additional_founders?.[idx]?.email?.message}
              >
                <Input
                  id={`additional_founders.${idx}.email`}
                  type="email"
                  {...register(`additional_founders.${idx}.email`)}
                />
              </FormField>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <FormField
                label="Phone"
                htmlFor={`additional_founders.${idx}.phone_number`}
                error={errors.additional_founders?.[idx]?.phone_number?.message}
              >
                <div className="flex gap-2">
                  <select
                    {...register(`additional_founders.${idx}.phone_country_code`)}
                    className={`${INPUT_CLASS} w-36 flex-none`}
                    aria-label="Country code"
                  >
                    {COUNTRY_CODES.map((c) => (
                      <option key={c.code} value={c.code}>
                        {c.label}
                      </option>
                    ))}
                  </select>
                  <Input
                    id={`additional_founders.${idx}.phone_number`}
                    type="tel"
                    placeholder="98765 43210"
                    {...register(`additional_founders.${idx}.phone_number`)}
                    className="flex-1"
                  />
                </div>
              </FormField>
              <FormField
                label="LinkedIn"
                htmlFor={`additional_founders.${idx}.linkedin_url`}
                error={errors.additional_founders?.[idx]?.linkedin_url?.message}
              >
                <Input
                  id={`additional_founders.${idx}.linkedin_url`}
                  type="url"
                  placeholder="https://linkedin.com/in/…"
                  {...register(`additional_founders.${idx}.linkedin_url`)}
                />
              </FormField>
            </div>
          </div>
        ))}

        <button
          type="button"
          onClick={() =>
            append({
              name: '',
              email: '',
              phone_country_code: '+91',
              phone_number: '',
              linkedin_url: '',
            })
          }
          className="flex items-center gap-2 text-sm font-medium text-brand hover:underline w-fit"
        >
          <PlusCircle className="h-4 w-4" />
          Add co-founder
        </button>
      </Section>

      {/* ── 3. Funding ── */}
      <Section title="Funding">
        <div>
          <p className="text-sm font-medium text-ink-body mb-2">
            Have you raised funds in the past?
          </p>
          <div className="flex gap-6">
            <label className="flex items-center gap-2 cursor-pointer text-sm">
              <input
                type="radio"
                value="yes"
                {...register('has_raised_funds')}
                className="accent-brand"
              />
              Yes
            </label>
            <label className="flex items-center gap-2 cursor-pointer text-sm">
              <input
                type="radio"
                value="no"
                {...register('has_raised_funds')}
                className="accent-brand"
              />
              No
            </label>
          </div>
        </div>

        {hasRaised === 'yes' && (
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField
              label="How much have you raised?"
              htmlFor="money_raised"
              error={errors.money_raised?.message}
              hint="e.g. ₹2 Cr, $500K"
            >
              <Input id="money_raised" {...register('money_raised')} />
            </FormField>
            <FormField
              label="Who are the investors?"
              htmlFor="existing_investors"
              error={errors.existing_investors?.message}
              hint="Names of angels, funds, etc."
            >
              <Input id="existing_investors" {...register('existing_investors')} />
            </FormField>
          </div>
        )}
      </Section>

      {/* ── 4. Financials (optional) ── */}
      <Section title="Financials (optional)">
        <p className="text-xs text-ink-muted">
          All monetary fields are in INR. Revenue and burn are <strong>monthly</strong> figures.
        </p>
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField
            label="Monthly revenue (₹)"
            htmlFor="revenue_inr"
            error={errors.revenue_inr?.message}
          >
            <Input
              id="revenue_inr"
              type="number"
              min={0}
              {...register('revenue_inr', {
                setValueAs: (v: string) => (v === '' ? undefined : parseFloat(v)),
              })}
              data-testid="field-revenue_inr"
            />
          </FormField>
          <FormField
            label="Monthly burn (₹)"
            htmlFor="burn_rate_inr"
            error={errors.burn_rate_inr?.message}
          >
            <Input
              id="burn_rate_inr"
              type="number"
              min={0}
              {...register('burn_rate_inr', {
                setValueAs: (v: string) => (v === '' ? undefined : parseFloat(v)),
              })}
              data-testid="field-burn_rate_inr"
            />
          </FormField>
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          <FormField
            label="Runway (months)"
            htmlFor="runway_months"
            error={errors.runway_months?.message}
          >
            <Input
              id="runway_months"
              type="number"
              min={0}
              {...register('runway_months', {
                setValueAs: (v: string) => (v === '' ? undefined : parseFloat(v)),
              })}
            />
          </FormField>
          <FormField
            label="Ask amount (₹ Cr)"
            htmlFor="ask_amount_cr"
            error={errors.ask_amount_cr?.message}
            hint="Total raise in INR crores"
          >
            <Input
              id="ask_amount_cr"
              type="number"
              min={0}
              step={0.1}
              {...register('ask_amount_cr', {
                setValueAs: (v: string) => (v === '' ? undefined : parseFloat(v)),
              })}
            />
          </FormField>
          <FormField
            label="Revenue model"
            htmlFor="revenue_model"
            error={errors.revenue_model?.message}
            hint="e.g. SaaS, transaction fee"
          >
            <Input id="revenue_model" {...register('revenue_model')} />
          </FormField>
        </div>
      </Section>

      {/* ── 5. Anything else ── */}
      <Section title="Anything else?">
        <FormField
          label="Is there anything else you'd like to share with us?"
          htmlFor="additional_notes"
          error={errors.additional_notes?.message}
          hint="Optional — max 2000 characters"
        >
          <textarea
            id="additional_notes"
            rows={4}
            className={`${INPUT_CLASS} h-auto`}
            placeholder="Traction highlights, upcoming milestones, why now — anything you feel is important"
            {...register('additional_notes')}
          />
        </FormField>
      </Section>

      {/* ── Error + submit ── */}
      {serverError ? (
        <div
          className="rounded-lg border border-error/30 bg-error/5 p-4 text-sm text-error"
          role="alert"
          data-testid="pitch-server-error"
        >
          <p className="font-semibold">Submission failed</p>
          <p className="mt-1">{serverError}</p>
          <p className="mt-2">
            Or email us directly:{' '}
            <a href={`mailto:${SUPPORT_EMAIL}`} className="font-medium underline">
              {SUPPORT_EMAIL}
            </a>
          </p>
        </div>
      ) : null}

      <Button
        type="submit"
        size="lg"
        disabled={isSubmitting}
        className="w-full sm:w-auto"
        data-testid="pitch-submit"
      >
        {isSubmitting ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden />
            Submitting…
          </>
        ) : (
          'Submit pitch'
        )}
      </Button>
    </form>
  );
}

// ── Page shell ────────────────────────────────────────────────────────────────

export function PublicPitchPage() {
  useEffect(() => {
    const prev = document.title;
    document.title = 'Pitch your startup — Warmup Ventures';
    return () => {
      document.title = prev;
    };
  }, []);

  const [successData, setSuccessData] = useState<PublicPitchSuccess | null>(null);

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-10 border-b border-border bg-background/95 backdrop-blur">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2">
            <BrandLogo size={28} />
            <span className="text-sm font-semibold text-ink-heading">Warmup Ventures</span>
          </div>
          <Link to="/signin" className="text-sm font-medium text-brand hover:underline">
            Already a member? Sign in
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-10">
        <div className="mb-8">
          <h1 className="text-3xl font-semibold text-ink-heading">Pitch your startup</h1>
          <p className="mt-2 text-ink-muted">
            Share your story with the Warmup Ventures community. Our team reviews every pitch and
            connects promising founders with the right LPs and VCs.
          </p>
        </div>

        {successData ? (
          <SuccessCard data={successData} />
        ) : (
          <PitchForm onSuccess={setSuccessData} />
        )}
      </main>
    </div>
  );
}
