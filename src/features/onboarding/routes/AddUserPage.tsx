import { useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Camera, CheckCircle2, Loader2, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ErrorState } from '@/components/error-state/ErrorState';
import { FileDropzone } from '@/components/forms/FileDropzone';
import { FormField } from '@/components/forms/FormField';
import { useOCR } from '@/features/onboarding/hooks/use-ocr';
import { useCardScan } from '@/features/onboarding/hooks/use-card-scan';
import { DuplicateContactDialog } from '@/features/onboarding/components/DuplicateContactDialog';
import {
  SCAN_CATEGORIES,
  zContactReviewForm,
  type CardScanParsed,
  type ContactReviewForm,
  type ScanCategory,
} from '@/features/onboarding/schemas';
import { toE164 } from '@/lib/phone';
import type { ApiError } from '@/api/errors';
import { can } from '@/lib/role-capabilities';
import { useRole } from '@/auth/use-auth';

const CATEGORY_LABEL: Record<ScanCategory, string> = {
  lp: 'LP',
  potential_lp: 'Potential LP',
  vc: 'VC',
  startup: 'Startup',
  partner: 'Partner',
};

const NON_ADMIN_CATEGORIES: readonly ScanCategory[] = ['potential_lp', 'vc', 'startup'];

function defaultsFrom(parsed: CardScanParsed | null, isAdmin: boolean): ContactReviewForm {
  return {
    name: parsed?.name ?? '',
    phone: parsed?.phone ?? '',
    email: parsed?.email ?? '',
    organisation: parsed?.organisation ?? '',
    designation: parsed?.designation ?? '',
    linkedin_url: parsed?.linkedin_url ?? '',
    website: parsed?.website ?? '',
    address: parsed?.address ?? '',
    category: isAdmin ? 'lp' : 'potential_lp',
  };
}

function emptyToNull(v: string | undefined): string | null {
  if (!v || v.trim() === '') return null;
  return v;
}

interface FieldFlagProps {
  parsedValue: string | null | undefined;
  required?: boolean;
}

// Render an amber chip when GPT-4o left a field null (low confidence),
// red when a required field is missing. Only shown after a card scan.
function FieldFlag({ parsedValue, required = false }: FieldFlagProps) {
  if (parsedValue && parsedValue.length > 0) return null;
  if (required) {
    return (
      <span className="inline-flex items-center rounded-full bg-error/10 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-error">
        Missing — required
      </span>
    );
  }
  return (
    <span className="inline-flex items-center rounded-full bg-warning/10 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-warning">
      Low confidence
    </span>
  );
}

// `/add-user` page — always-visible contact form with an optional
// "autofill from business card" panel above it. Scanning pre-fills the
// form fields; the user can also fill everything manually and skip the scan.
export function AddUserPage() {
  const role = useRole();
  const isAdmin = can(role, 'admin.any');
  const visibleCategories = isAdmin ? SCAN_CATEGORIES : NON_ADMIN_CATEGORIES;

  // `parsed` is null until a card scan succeeds. Used to show FieldFlags
  // and the "autofilled" success banner.
  const [parsed, setParsed] = useState<CardScanParsed | null>(null);
  // OCR raw text from the scan — sent as raw_text on the final submit.
  const [rawText, setRawText] = useState('');
  // True while the OCR + AI parse call is in-flight (first cardScan.mutate).
  const [isParsingCard, setIsParsingCard] = useState(false);
  const [duplicateUserId, setDuplicateUserId] = useState<string | null>(null);
  const [duplicateOpen, setDuplicateOpen] = useState(false);

  // Hidden <input capture="environment"> for the "Take photo" button.
  // On mobile this opens the rear camera; on desktop it falls back to the
  // file picker.
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const ocr = useOCR();
  const cardScan = useCardScan();

  const form = useForm<ContactReviewForm>({
    resolver: zodResolver(zContactReviewForm),
    defaultValues: defaultsFrom(null, isAdmin),
  });

  // True while OCR or the AI parse call is running — disables the form and
  // the scan inputs so the user can't trigger a second scan mid-flight.
  const scanBusy = isParsingCard || ocr.isRunning;

  const startParse = (text: string) => {
    const trimmed = text.trim();
    if (trimmed.length < 10) {
      toast.error('OCR output looks too short — try a clearer image');
      return;
    }
    setRawText(trimmed);
    setIsParsingCard(true);
    cardScan.mutate(
      { raw_text: trimmed },
      {
        onSuccess: (data) => {
          setParsed(data.parsed);
          form.reset(defaultsFrom(data.parsed, isAdmin));
          setIsParsingCard(false);
          toast.success('Card scanned — fields autofilled. Review and save.');
        },
        onError: (err: ApiError) => {
          setIsParsingCard(false);
          if (err.code !== 'validation_error') {
            toast.error(err.userMessage);
          }
        },
      },
    );
  };

  const onFiles = async (files: File[]) => {
    const file = files[0];
    if (!file) return;
    const result = await ocr.recognize(file);
    if (result?.raw_text) {
      startParse(result.raw_text);
    } else {
      toast.error('Could not read text from this image. Try a clearer photo.');
    }
  };

  const clearScan = () => {
    cardScan.reset();
    ocr.reset();
    setParsed(null);
    setRawText('');
    setIsParsingCard(false);
    form.reset(defaultsFrom(null, isAdmin));
  };

  const onConfirmSubmit = (values: ContactReviewForm) => {
    // If no card was scanned, build raw_text from the form so the backend
    // always has something to store (raw_text is required on the endpoint).
    const effectiveRawText =
      rawText ||
      [values.name, values.phone, values.email, values.organisation, values.designation]
        .filter(Boolean)
        .join('\n');

    cardScan.mutate(
      {
        raw_text: effectiveRawText,
        parsed: {
          name: values.name,
          phone: toE164(values.phone),
          email: emptyToNull(values.email),
          organisation: emptyToNull(values.organisation),
          designation: emptyToNull(values.designation),
          linkedin_url: emptyToNull(values.linkedin_url),
          website: emptyToNull(values.website),
          address: emptyToNull(values.address),
        },
        category: values.category,
      },
      {
        onSuccess: (data) => {
          if (data.pending_approval) {
            toast.success('Referral submitted — admin will review and approve.');
          } else if (data.user_created) {
            toast.success('Contact added — user created.');
          } else {
            toast.success('Contact saved — user already exists.');
          }
          clearScan();
        },
        onError: (err: ApiError) => {
          if (err.code === 'duplicate_contact') {
            const existing =
              (err.detail as { existing_user_id?: string } | null)?.existing_user_id ?? null;
            setDuplicateUserId(existing);
            setDuplicateOpen(true);
            return;
          }
          if (err.code !== 'validation_error') {
            toast.error(err.userMessage);
          }
        },
      },
    );
  };

  // The save button shows a spinner only during the final submit, not during
  // the parse phase (which has its own indicator in the scan card).
  const isSubmitting = cardScan.isPending && !isParsingCard;

  return (
    <div className="flex flex-col gap-6">
      <header>
        <h1 className="text-3xl font-semibold text-ink-heading">
          {isAdmin ? 'Add a contact' : 'Refer someone'}
        </h1>
        <p className="text-sm text-ink-muted">
          {isAdmin
            ? 'Fill in the details below, or snap a business card to autofill the form automatically.'
            : 'Know someone who should join? Fill in their details and submit — our team will review and reach out.'}
        </p>
      </header>

      {/* ── Autofill from business card (optional) ── */}
      <Card>
        <CardHeader className="flex flex-col gap-1.5 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2">
              <CardTitle className="text-base">Autofill from business card</CardTitle>
              <span className="inline-flex items-center rounded-full border border-border bg-surface-muted px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-ink-muted">
                Optional
              </span>
            </div>
            {parsed ? (
              <p className="flex items-center gap-1.5 text-sm text-success">
                <CheckCircle2 className="h-4 w-4 shrink-0" aria-hidden />
                Card scanned — form autofilled below
              </p>
            ) : (
              <CardDescription>
                Drop / pick a JPG / PNG / HEIC, or use your camera. Single side; well-lit photo.
              </CardDescription>
            )}
          </div>
          {parsed ? (
            <Button variant="outline" size="sm" onClick={clearScan} className="shrink-0 self-start">
              <RefreshCw className="h-3.5 w-3.5" aria-hidden />
              <span>Scan new card</span>
            </Button>
          ) : null}
        </CardHeader>

        {/* Scan inputs hidden once a card has been successfully parsed */}
        {!parsed ? (
          <CardContent className="flex flex-col gap-3 pt-0">
            <FileDropzone
              onFiles={(files) => {
                void onFiles(files);
              }}
              accept={{
                'image/jpeg': ['.jpg', '.jpeg'],
                'image/png': ['.png'],
                'image/heic': ['.heic'],
              }}
              disabled={scanBusy}
              label="Drop a card image or click to upload"
            />

            <div className="flex items-center gap-3 text-xs text-ink-muted">
              <span className="h-px flex-1 bg-border" aria-hidden />
              <span>or</span>
              <span className="h-px flex-1 bg-border" aria-hidden />
            </div>

            <div className="flex flex-col gap-1">
              <input
                ref={cameraInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                className="sr-only"
                aria-hidden
                tabIndex={-1}
                data-testid="add-user-camera-input"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) void onFiles([file]);
                  // Allow re-picking the same file
                  e.target.value = '';
                }}
              />
              <Button
                type="button"
                variant="outline"
                disabled={scanBusy}
                onClick={() => cameraInputRef.current?.click()}
                data-testid="add-user-camera-button"
              >
                <Camera className="h-4 w-4" aria-hidden />
                <span>Take photo with camera</span>
              </Button>
              <p className="text-xs text-ink-muted">
                Opens your phone camera. Falls back to a file picker on desktop.
              </p>
            </div>

            {ocr.isRunning ? (
              <div
                role="status"
                aria-live="polite"
                data-testid="ocr-progress"
                className="flex items-center gap-3 rounded-md border border-border bg-surface-muted p-3 text-sm text-ink-body"
              >
                <Loader2 className="h-4 w-4 animate-spin text-brand" aria-hidden />
                <span>
                  Reading card… {Math.round(ocr.progress * 100)}%{' '}
                  {ocr.status ? <em className="text-ink-muted">({ocr.status})</em> : null}
                </span>
              </div>
            ) : null}

            {isParsingCard ? (
              <div
                role="status"
                aria-live="polite"
                className="flex items-center gap-3 rounded-md border border-border bg-surface-muted p-3 text-sm text-ink-body"
              >
                <Loader2 className="h-4 w-4 animate-spin text-brand" aria-hidden />
                <span>Parsing card with GPT-4o…</span>
              </div>
            ) : null}

            {ocr.error ? (
              <ErrorState
                error={ocr.error}
                compact
                onRetry={() => {
                  ocr.reset();
                }}
              />
            ) : null}

            {/* Only show scan-phase errors here, not submit errors */}
            {cardScan.isError && isParsingCard === false && cardScan.error ? (
              <ErrorState error={cardScan.error} compact />
            ) : null}
          </CardContent>
        ) : null}
      </Card>

      {/* ── Contact details form — always visible ── */}
      <Card>
        <CardHeader>
          <CardTitle>Contact details</CardTitle>
          <CardDescription>
            {parsed
              ? 'Review the autofilled fields — correct anything that looks off, then save.'
              : 'Fill in the contact details manually and save.'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form
            onSubmit={form.handleSubmit(onConfirmSubmit)}
            className="flex flex-col gap-4"
            noValidate
          >
            <fieldset disabled={scanBusy || isSubmitting} className="contents">
              <FormField
                label="Full name"
                htmlFor="add-user-name"
                error={form.formState.errors.name?.message}
              >
                <div className="flex flex-col gap-1">
                  <Input id="add-user-name" {...form.register('name')} />
                  {parsed ? <FieldFlag parsedValue={parsed.name} required /> : null}
                </div>
              </FormField>

              <FormField
                label="Phone"
                htmlFor="add-user-phone"
                error={form.formState.errors.phone?.message}
                hint="Will be normalised to E.164 before saving."
              >
                <div className="flex flex-col gap-1">
                  <Input id="add-user-phone" inputMode="tel" {...form.register('phone')} />
                  {parsed ? <FieldFlag parsedValue={parsed.phone} required /> : null}
                </div>
              </FormField>

              <FormField
                label="Email"
                htmlFor="add-user-email"
                error={form.formState.errors.email?.message}
              >
                <div className="flex flex-col gap-1">
                  <Input id="add-user-email" type="email" {...form.register('email')} />
                  {parsed ? <FieldFlag parsedValue={parsed.email} /> : null}
                </div>
              </FormField>

              <FormField
                label="Organisation"
                htmlFor="add-user-org"
                error={form.formState.errors.organisation?.message}
              >
                <div className="flex flex-col gap-1">
                  <Input id="add-user-org" {...form.register('organisation')} />
                  {parsed ? <FieldFlag parsedValue={parsed.organisation} /> : null}
                </div>
              </FormField>

              <FormField
                label="Designation"
                htmlFor="add-user-desig"
                error={form.formState.errors.designation?.message}
              >
                <div className="flex flex-col gap-1">
                  <Input id="add-user-desig" {...form.register('designation')} />
                  {parsed ? <FieldFlag parsedValue={parsed.designation} /> : null}
                </div>
              </FormField>

              <FormField
                label="LinkedIn URL"
                htmlFor="add-user-linkedin"
                error={form.formState.errors.linkedin_url?.message}
              >
                <div className="flex flex-col gap-1">
                  <Input
                    id="add-user-linkedin"
                    placeholder="https://linkedin.com/in/…"
                    {...form.register('linkedin_url')}
                  />
                  {parsed ? <FieldFlag parsedValue={parsed.linkedin_url} /> : null}
                </div>
              </FormField>

              <FormField
                label="Website"
                htmlFor="add-user-website"
                error={form.formState.errors.website?.message}
              >
                <div className="flex flex-col gap-1">
                  <Input
                    id="add-user-website"
                    placeholder="https://example.com"
                    {...form.register('website')}
                  />
                  {parsed ? <FieldFlag parsedValue={parsed.website ?? null} /> : null}
                </div>
              </FormField>

              <FormField
                label="Address"
                htmlFor="add-user-address"
                error={form.formState.errors.address?.message}
              >
                <div className="flex flex-col gap-1">
                  <Input
                    id="add-user-address"
                    placeholder="123 MG Road, Bengaluru 560001"
                    {...form.register('address')}
                  />
                  {parsed ? <FieldFlag parsedValue={parsed.address ?? null} /> : null}
                </div>
              </FormField>

              <fieldset className="flex flex-col gap-2">
                <legend className="text-sm font-medium text-ink-heading">Category</legend>
                <div className="flex flex-wrap gap-2">
                  {visibleCategories.map((c) => (
                    <Label
                      key={c}
                      className="flex cursor-pointer items-center gap-2 rounded-md border border-border bg-surface px-3 py-2 text-sm hover:bg-surface-muted"
                    >
                      <input type="radio" value={c} {...form.register('category')} />
                      {CATEGORY_LABEL[c]}
                    </Label>
                  ))}
                </div>
                {form.formState.errors.category ? (
                  <p className="text-xs text-error" role="alert">
                    {form.formState.errors.category.message}
                  </p>
                ) : null}
              </fieldset>
            </fieldset>

            {!isParsingCard && cardScan.isError && cardScan.error?.code !== 'duplicate_contact' ? (
              <ErrorState error={cardScan.error} compact />
            ) : null}

            <div className="flex justify-end">
              <Button
                type="submit"
                disabled={scanBusy || isSubmitting}
                data-testid="add-user-submit"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                    <span>Saving…</span>
                  </>
                ) : isAdmin ? (
                  'Save contact'
                ) : (
                  'Submit referral'
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <DuplicateContactDialog
        open={duplicateOpen}
        existingUserId={duplicateUserId}
        onClose={() => setDuplicateOpen(false)}
      />
    </div>
  );
}
