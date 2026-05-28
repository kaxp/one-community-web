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
import { submitPublicAddUser } from '@/api/public/add-user';
import {
  zPublicAddUserForm,
  PUBLIC_ADD_USER_ROLES,
  PUBLIC_ADD_USER_ROLE_LABELS,
  type PublicAddUserFormValues,
  type PublicAddUserSuccess,
} from '@/features/public-add-user/schemas';

const SUPPORT_EMAIL = 'pitch@warmupventures.com';

const INPUT_CLASS =
  'flex h-10 w-full rounded-md border border-border bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-ink-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50';

// ── Success / special states ──────────────────────────────────────────────────

function SuccessCard({ data }: { data: PublicAddUserSuccess }) {
  return (
    <Card className="max-w-lg" data-testid="signup-success-card">
      <CardHeader className="flex flex-row items-start gap-3 space-y-0">
        <CheckCircle2 className="mt-0.5 h-6 w-6 flex-none text-success" aria-hidden />
        <div>
          <CardTitle>You&apos;re in the queue</CardTitle>
          <CardDescription>
            Thanks for signing up. Our team reviews every submission and will reach out within one
            business day.
          </CardDescription>
        </div>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <p className="text-sm text-ink-body">
          Quote this reference if you email us:{' '}
          <span className="font-mono font-semibold text-ink-heading" data-testid="signup-id">
            {data.signup_id}
          </span>
        </p>
        <p className="text-sm text-ink-muted">
          Questions?{' '}
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
    <Card className="max-w-lg border-warning/30 bg-warning/5" data-testid="signup-rate-limited">
      <CardHeader>
        <CardTitle>Submission limit reached</CardTitle>
        <CardDescription>
          You have hit the limit of 3 submissions per hour from this network.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-ink-body">
          Please try again in an hour, or email us at{' '}
          <a href={`mailto:${SUPPORT_EMAIL}`} className="font-medium text-brand hover:underline">
            {SUPPORT_EMAIL}
          </a>
          .
        </p>
      </CardContent>
    </Card>
  );
}

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

function JoinForm({ onSuccess }: { onSuccess: (data: PublicAddUserSuccess) => void }) {
  const [serverError, setServerError] = useState<string | null>(null);
  const [rateLimited, setRateLimited] = useState(false);

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<PublicAddUserFormValues>({
    resolver: zodResolver(zPublicAddUserForm),
  });

  const onSubmit = handleSubmit(async (values) => {
    setServerError(null);
    const result = await submitPublicAddUser(values);
    if (result.kind === 'success') {
      onSuccess(result.data);
    } else if (result.kind === 'rate_limited') {
      setRateLimited(true);
    } else if (result.kind === 'invalid_email') {
      setError('email', { message: 'Enter a valid email address.' });
    } else if (result.kind === 'validation_error') {
      for (const [field, msg] of Object.entries(result.fieldErrors)) {
        // FastAPI returns `body.<field>` in loc; both shapes land on the
        // last segment which matches our form keys.
        setError(field as keyof PublicAddUserFormValues, { message: msg });
      }
    } else {
      setServerError(result.message);
    }
  });

  if (rateLimited) return <RateLimitedCard />;

  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-col gap-8" data-testid="signup-form">
      <Section title="About you">
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField label="Full name *" htmlFor="name" error={errors.name?.message}>
            <Input id="name" autoComplete="name" {...register('name')} data-testid="field-name" />
          </FormField>
          <FormField label="Email *" htmlFor="email" error={errors.email?.message}>
            <Input
              id="email"
              type="email"
              inputMode="email"
              autoComplete="email"
              {...register('email')}
              data-testid="field-email"
            />
          </FormField>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <FormField label="Role *" htmlFor="role" error={errors.role?.message}>
            <select
              id="role"
              {...register('role')}
              className={INPUT_CLASS}
              data-testid="field-role"
              defaultValue=""
            >
              <option value="" disabled>
                Select role
              </option>
              {PUBLIC_ADD_USER_ROLES.map((r) => (
                <option key={r} value={r}>
                  {PUBLIC_ADD_USER_ROLE_LABELS[r]}
                </option>
              ))}
            </select>
          </FormField>
          <FormField
            label="Phone"
            htmlFor="phone"
            error={errors.phone?.message}
            hint="Include country code — e.g. +91 98765 43210"
          >
            <Input
              id="phone"
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              {...register('phone')}
              data-testid="field-phone"
            />
          </FormField>
        </div>
      </Section>

      <Section title="Background">
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField
            label="Organisation"
            htmlFor="organisation"
            error={errors.organisation?.message}
            hint="Company, fund, or firm name"
          >
            <Input
              id="organisation"
              autoComplete="organization"
              {...register('organisation')}
              data-testid="field-organisation"
            />
          </FormField>
          <FormField label="City" htmlFor="city" error={errors.city?.message}>
            <Input
              id="city"
              autoComplete="address-level2"
              {...register('city')}
              data-testid="field-city"
            />
          </FormField>
        </div>

        <FormField
          label="LinkedIn URL"
          htmlFor="linkedin_url"
          error={errors.linkedin_url?.message}
          hint="https://linkedin.com/in/…"
        >
          <Input
            id="linkedin_url"
            type="url"
            inputMode="url"
            placeholder="https://"
            {...register('linkedin_url')}
            data-testid="field-linkedin_url"
          />
        </FormField>

        <FormField
          label="Anything else?"
          htmlFor="message"
          error={errors.message?.message}
          hint="Tell us what brought you here, what you invest in, or how you'd like to help."
        >
          <textarea
            id="message"
            rows={4}
            className={`${INPUT_CLASS} h-auto`}
            {...register('message')}
            data-testid="field-message"
          />
        </FormField>
      </Section>

      {serverError ? (
        <div
          className="rounded-lg border border-error/30 bg-error/5 p-4 text-sm text-error"
          role="alert"
          data-testid="signup-server-error"
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
        data-testid="signup-submit"
      >
        {isSubmitting ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden />
            Submitting…
          </>
        ) : (
          'Join Warmup community'
        )}
      </Button>
    </form>
  );
}

// ── Page shell ────────────────────────────────────────────────────────────────

// Public Join Community landing page — anonymous LP / partner / advisor /
// VC signup. Lives OUTSIDE the authenticated layout shell. Mirrors
// `PublicPitchPage` (the only other public route).
export function PublicAddUserPage() {
  useEffect(() => {
    const prev = document.title;
    document.title = 'Join the community — Warmup Ventures';
    return () => {
      document.title = prev;
    };
  }, []);

  const [successData, setSuccessData] = useState<PublicAddUserSuccess | null>(null);

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
          <h1 className="text-3xl font-semibold text-ink-heading">Join the Warmup community</h1>
          <p className="mt-2 text-ink-muted">
            Whether you back early-stage founders directly, advise teams, or want to stay in the
            loop, share a few details and our team will reach out within one business day.
          </p>
        </div>

        {successData ? <SuccessCard data={successData} /> : <JoinForm onSuccess={setSuccessData} />}
      </main>
    </div>
  );
}
