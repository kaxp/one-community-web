// Deliberately NOT built on <ExecutionPanel>. PRD §6.7.1 reserves the panel for the
// "single form → single mutation → single response" pattern. Sign-in is a 2-step
// state machine (phone → OTP) with chained mutations + a post-success /auth/me fetch
// + role-based navigation, plus a 30s resend cooldown timer. The state graph doesn't
// fit the panel's contract; rolling a hand-built form here is the right call.
import { useState } from 'react';
import { clearAllSearchConversations } from '@/features/search/hooks/use-conversation';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2 } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { BrandLogo } from '@/components/brand/BrandLogo';
import { FormField } from '@/components/forms/FormField';
import { PhoneInput } from '@/components/forms/PhoneInput';
import { ErrorState } from '@/components/error-state/ErrorState';
import { toE164, isValidE164 } from '@/lib/phone';
import { useAuthStore } from '@/auth/auth-store';
import { useOtpSend } from '@/features/auth/hooks/use-otp-send';
import { useOtpVerify } from '@/features/auth/hooks/use-otp-verify';
import { getMe } from '@/api/endpoints';
import { zPhoneInput, type PhoneInput as PhoneInputForm } from '@/features/auth/schemas';
import { DevPhoneHelper } from '@/features/auth/components/DevPhoneHelper';
import {
  expiresAtFrom,
  profileFromMe,
  seedProfileFromVerify,
} from '@/features/auth/lib/hydrate-session';
import { nextRouteForUser } from '@/features/auth/lib/post-signin-navigate';

export function SignInPage() {
  const navigate = useNavigate();
  const [postSigninError, setPostSigninError] = useState<unknown>(null);

  const phoneForm = useForm<PhoneInputForm>({
    resolver: zodResolver(zPhoneInput),
    defaultValues: { phone: '' },
    mode: 'onSubmit',
  });

  const otpSend = useOtpSend();
  const otpVerify = useOtpVerify();

  // TODO(kaxp): Commenting out the OTP flow for now — auto-verify after phone submit
  const handlePhoneSubmit = phoneForm.handleSubmit(({ phone: rawPhone }) => {
    const canonical = toE164(rawPhone);
    if (!isValidE164(canonical)) {
      phoneForm.setError('phone', { message: 'Enter a valid mobile number' });
      return;
    }
    otpSend.mutate(
      { phone: canonical },
      {
        onSuccess: () => {
          // TODO(kaxp): Commenting out the OTP flow for now
          // setStep('otp'); setResendSecondsLeft(RESEND_COOLDOWN_SECONDS);
          otpVerify.mutate(
            { phone: canonical, otp: '000000' },
            {
              onSuccess: async (data) => {
                const token = data.access_token;
                const expiresAt = expiresAtFrom(data);
                const seeded = seedProfileFromVerify(data, canonical);
                // Phase H.1: clear any prior user's search history from
                // sessionStorage before setting the new session. This is
                // defence-in-depth on top of the per-user key scoping
                // shipped in Phase H — covers cases where the previous
                // user's logout didn't run (e.g. tab crash, multi-tab).
                clearAllSearchConversations();
                useAuthStore.getState().setSession({ token, user: seeded, expiresAt });
                try {
                  const me = await getMe();
                  useAuthStore.getState().setUser(profileFromMe(me));
                  navigate(nextRouteForUser(me), { replace: true });
                } catch (err) {
                  setPostSigninError(err);
                  useAuthStore.getState().clear();
                }
              },
              onError: () => setPostSigninError(null),
            },
          );
        },
      },
    );
  });

  const onPickDevPhone = (picked: string) => {
    phoneForm.setValue('phone', picked);
    phoneForm.clearErrors('phone');
  };

  const isPending = otpSend.isPending || otpVerify.isPending;

  return (
    // <main> landmark (issues.md [A-1]) — auth-walled routes inherit one from
    // <AppShell>; SignInPage sits outside the shell so it owns its own.
    <main className="flex min-h-screen items-center justify-center bg-background px-4 py-12">
      <div className="w-full max-w-md">
        <div className="mb-6 flex items-center gap-3">
          <BrandLogo size={40} />
          <h1 className="text-2xl font-semibold text-ink-heading">One Community</h1>
        </div>
        <Card>
          <CardHeader>
            <CardTitle>Sign in</CardTitle>
            <CardDescription>Enter your registered mobile number to continue.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <form onSubmit={handlePhoneSubmit} className="flex flex-col gap-4">
              <FormField
                label="Mobile number"
                htmlFor="signin-phone"
                error={phoneForm.formState.errors.phone?.message}
              >
                <PhoneInput
                  id="signin-phone"
                  autoFocus
                  disabled={isPending}
                  {...phoneForm.register('phone')}
                />
              </FormField>
              {otpSend.isError ? (
                <ErrorState error={otpSend.error} compact />
              ) : otpVerify.isError && otpVerify.error ? (
                <p className="text-sm text-destructive">{otpVerify.error.userMessage}</p>
              ) : null}
              {postSigninError ? <ErrorState error={postSigninError} compact /> : null}
              <Button type="submit" disabled={isPending}>
                {isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                    <span>Signing in…</span>
                  </>
                ) : (
                  'Sign in'
                )}
              </Button>
              {import.meta.env.DEV ? <DevPhoneHelper onPick={onPickDevPhone} /> : null}
            </form>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
