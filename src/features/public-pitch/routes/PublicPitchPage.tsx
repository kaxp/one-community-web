import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { CheckCircle2, Loader2 } from 'lucide-react';
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
  type PublicPitchFormValues,
  type PublicPitchSuccess,
} from '@/features/public-pitch/schemas';

const SUPPORT_EMAIL = 'pitch@warmupventures.com';

// Shared Tailwind class matching the shadcn Input style.
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
      <legend className="text-sm font-semibold uppercase tracking-wide text-ink-muted">
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
    setError,
    formState: { errors, isSubmitting },
  } = useForm<PublicPitchFormValues>({
    resolver: zodResolver(zPublicPitchForm),
  });

  const onSubmit = handleSubmit(async (values) => {
    setServerError(null);
    const result = await submitPublicPitch(values);
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
    <form onSubmit={onSubmit} noValidate className="flex flex-col gap-8" data-testid="pitch-form">
      <Section title="About your company">
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
          <FormField
            label="Sector / industry *"
            htmlFor="sector"
            error={errors.sector?.message}
            hint="e.g. Fintech, Agritech, SaaS"
          >
            <Input id="sector" {...register('sector')} data-testid="field-sector" />
          </FormField>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
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
        </div>

        <FormField
          label="One-line tagline *"
          htmlFor="tagline"
          error={errors.tagline?.message}
          hint="Max 280 characters"
        >
          <Input id="tagline" {...register('tagline')} data-testid="field-tagline" />
        </FormField>

        <FormField
          label="Description *"
          htmlFor="description"
          error={errors.description?.message}
          hint="What do you do, who for, and why now? Max 4000 characters."
        >
          <textarea
            id="description"
            rows={5}
            className={`${INPUT_CLASS} h-auto`}
            {...register('description')}
            data-testid="field-description"
          />
        </FormField>

        <div className="grid gap-4 sm:grid-cols-2">
          <FormField label="Website" htmlFor="website_url" error={errors.website_url?.message}>
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
      </Section>

      <Section title="Founder details">
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
          <FormField
            label="Phone"
            htmlFor="phone"
            error={errors.phone?.message}
            hint="Include country code, e.g. +91 98765 43210"
          >
            <Input id="phone" type="tel" inputMode="tel" {...register('phone')} />
          </FormField>
          <FormField label="Team size" htmlFor="team_size" error={errors.team_size?.message}>
            <Input
              id="team_size"
              type="number"
              min={1}
              {...register('team_size', {
                setValueAs: (v: string) => (v === '' ? undefined : parseFloat(v)),
              })}
            />
          </FormField>
        </div>
      </Section>

      <Section title="Financials (optional)">
        <p className="text-xs text-ink-muted -mt-2">
          All monetary fields are in INR. Revenue and burn are <strong>monthly</strong> figures.
        </p>
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField
            label="Monthly revenue (₹)"
            htmlFor="revenue_inr"
            error={errors.revenue_inr?.message}
            hint="Monthly INR — we'll annualise downstream"
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
            hint="Monthly INR — we'll annualise downstream"
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
        <div className="grid gap-4 sm:grid-cols-2">
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
            label="Current balance (₹)"
            htmlFor="current_balance_inr"
            error={errors.current_balance_inr?.message}
          >
            <Input
              id="current_balance_inr"
              type="number"
              min={0}
              {...register('current_balance_inr', {
                setValueAs: (v: string) => (v === '' ? undefined : parseFloat(v)),
              })}
            />
          </FormField>
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          <FormField label="Growth % (MoM)" htmlFor="growth_pct" error={errors.growth_pct?.message}>
            <Input
              id="growth_pct"
              type="number"
              {...register('growth_pct', {
                setValueAs: (v: string) => (v === '' ? undefined : parseFloat(v)),
              })}
            />
          </FormField>
          <FormField
            label="Gross margin %"
            htmlFor="gross_margin_pct"
            error={errors.gross_margin_pct?.message}
          >
            <Input
              id="gross_margin_pct"
              type="number"
              {...register('gross_margin_pct', {
                setValueAs: (v: string) => (v === '' ? undefined : parseFloat(v)),
              })}
            />
          </FormField>
          <FormField
            label="Customer count"
            htmlFor="customer_count"
            error={errors.customer_count?.message}
          >
            <Input
              id="customer_count"
              type="number"
              min={0}
              {...register('customer_count', {
                setValueAs: (v: string) => (v === '' ? undefined : parseFloat(v)),
              })}
            />
          </FormField>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
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
            hint="e.g. SaaS subscription, transaction fee"
          >
            <Input id="revenue_model" {...register('revenue_model')} />
          </FormField>
        </div>
      </Section>

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

// Stage 6 S8 — public pitch submission landing page.
// Lives OUTSIDE the authenticated layout shell (no sidebar, no RoleGuard).
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
      {/* Minimal top bar */}
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
