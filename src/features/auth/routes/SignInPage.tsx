// Deliberately NOT built on <ExecutionPanel>. PRD §6.7.1 reserves the panel for the
// "single form → single mutation → single response" pattern. Sign-in is a 2-step
// state machine (phone → OTP) with chained mutations + a post-success /auth/me fetch
// + role-based navigation, plus a 30s resend cooldown timer. The state graph doesn't
// fit the panel's contract; rolling a hand-built form here is the right call.
import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2 } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { BrandLogo } from '@/components/brand/BrandLogo';
import { FormField } from '@/components/forms/FormField';
import { PhoneInput } from '@/components/forms/PhoneInput';
import { OTPInput } from '@/components/forms/OTPInput';
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

const RESEND_COOLDOWN_SECONDS = 30;

function formatRetryAfter(seconds: number): string {
  if (seconds < 60) return `${seconds} second${seconds !== 1 ? 's' : ''}`;
  const mins = Math.ceil(seconds / 60);
  return `${mins} minute${mins !== 1 ? 's' : ''}`;
}

export function SignInPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState<'phone' | 'otp'>('phone');
  const [phone, setPhone] = useState<string>('');
  const [otp, setOtp] = useState<string>('');
  const [resendSecondsLeft, setResendSecondsLeft] = useState(0);
  const [postSigninError, setPostSigninError] = useState<unknown>(null);
  const timerRef = useRef<number | null>(null);

  const phoneForm = useForm<PhoneInputForm>({
    resolver: zodResolver(zPhoneInput),
    defaultValues: { phone: '' },
    mode: 'onSubmit',
  });

  const otpSend = useOtpSend();
  const otpVerify = useOtpVerify();

  useEffect(() => {
    if (resendSecondsLeft <= 0) return;
    timerRef.current = window.setTimeout(() => {
      setResendSecondsLeft((s) => Math.max(0, s - 1));
    }, 1000);
    return () => {
      if (timerRef.current) window.clearTimeout(timerRef.current);
    };
  }, [resendSecondsLeft]);

  const handlePhoneSubmit = phoneForm.handleSubmit(({ phone: rawPhone }) => {
    const canonical = toE164(rawPhone);
    if (!isValidE164(canonical)) {
      phoneForm.setError('phone', { message: 'Enter a valid mobile number' });
      return;
    }
    setPhone(canonical);
    otpSend.mutate(
      { phone: canonical },
      {
        onSuccess: () => {
          setStep('otp');
          setResendSecondsLeft(RESEND_COOLDOWN_SECONDS);
          setOtp('');
        },
      },
    );
  });

  const triggerVerify = (codeOverride?: string) => {
    const code = codeOverride ?? otp;
    if (!/^\d{6}$/.test(code)) return;
    otpVerify.mutate(
      { phone, otp: code },
      {
        onSuccess: async (data) => {
          const token = data.access_token;
          const expiresAt = expiresAtFrom(data);
          const seeded = seedProfileFromVerify(data, phone);
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
        onError: () => setOtp(''),
      },
    );
  };

  const handleOtpChange = (next: string) => {
    setOtp(next);
    if (next.length === 6) triggerVerify(next);
  };

  const handleResend = () => {
    setOtp('');
    otpSend.mutate(
      { phone },
      {
        onSuccess: () => setResendSecondsLeft(RESEND_COOLDOWN_SECONDS),
      },
    );
  };

  const onPickDevPhone = (picked: string) => {
    phoneForm.setValue('phone', picked);
    phoneForm.clearErrors('phone');
  };

  const verifying = otpVerify.isPending || otpSend.isPending;

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
            <CardDescription>
              {step === 'phone'
                ? 'Enter your registered mobile number. We will send you a one-time code.'
                : `We sent a 6-digit code to ${phone}. Enter it below to continue.`}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {step === 'phone' ? (
              <form onSubmit={handlePhoneSubmit} className="flex flex-col gap-4">
                <FormField
                  label="Mobile number"
                  htmlFor="signin-phone"
                  error={phoneForm.formState.errors.phone?.message}
                >
                  <PhoneInput
                    id="signin-phone"
                    autoFocus
                    disabled={otpSend.isPending}
                    {...phoneForm.register('phone')}
                  />
                </FormField>
                {otpSend.isError ? (
                  otpSend.error.code === 'rate_limit_exceeded' ? (
                    <p className="text-sm text-destructive">
                      Too many attempts.{' '}
                      {otpSend.error.retryAfterSeconds
                        ? `Try again in ${formatRetryAfter(otpSend.error.retryAfterSeconds)}.`
                        : 'Please wait before trying again.'}
                    </p>
                  ) : (
                    <ErrorState error={otpSend.error} compact />
                  )
                ) : null}
                <Button type="submit" disabled={otpSend.isPending}>
                  {otpSend.isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                      <span>Sending…</span>
                    </>
                  ) : (
                    'Send OTP'
                  )}
                </Button>
                {import.meta.env.DEV ? <DevPhoneHelper onPick={onPickDevPhone} /> : null}
              </form>
            ) : (
              <div className="flex flex-col gap-4">
                <FormField
                  label="One-time code"
                  htmlFor="signin-otp"
                  error={
                    otpVerify.isError && otpVerify.error ? otpVerify.error.userMessage : undefined
                  }
                >
                  <OTPInput
                    id="signin-otp"
                    value={otp}
                    onChange={handleOtpChange}
                    autoFocus
                    disabled={verifying}
                  />
                </FormField>
                {postSigninError ? (
                  <ErrorState error={postSigninError} compact onRetry={() => triggerVerify()} />
                ) : null}
                <div className="flex items-center justify-between">
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => {
                      setStep('phone');
                      setOtp('');
                      otpVerify.reset();
                      setPostSigninError(null);
                    }}
                    disabled={verifying}
                  >
                    Change number
                  </Button>
                  <div className="flex flex-col items-end gap-1">
                    <Button
                      type="button"
                      variant="link"
                      onClick={handleResend}
                      disabled={
                        resendSecondsLeft > 0 ||
                        verifying ||
                        otpSend.error?.code === 'rate_limit_exceeded'
                      }
                    >
                      {resendSecondsLeft > 0 ? `Resend in ${resendSecondsLeft}s` : 'Resend OTP'}
                    </Button>
                    {otpSend.isError && otpSend.error.code === 'rate_limit_exceeded' ? (
                      <p className="text-xs text-destructive">
                        Too many attempts.{' '}
                        {otpSend.error.retryAfterSeconds
                          ? `Try again in ${formatRetryAfter(otpSend.error.retryAfterSeconds)}.`
                          : 'Please wait.'}
                      </p>
                    ) : null}
                  </div>
                </div>
                <Button
                  type="button"
                  onClick={() => triggerVerify()}
                  disabled={otp.length !== 6 || verifying}
                >
                  {otpVerify.isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                      <span>Verifying…</span>
                    </>
                  ) : (
                    'Verify & continue'
                  )}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
