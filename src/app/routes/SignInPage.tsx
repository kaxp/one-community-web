import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { BrandLogo } from '@/components/brand/BrandLogo';
import { env } from '@/lib/env';
import { DEV_OTP_BYPASS_CODE } from '@/lib/dev-seed-users';

export function SignInPage() {
  const showHint = env.OTP_BYPASS_HINT && env.APP_ENV === 'development';

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 py-12">
      <div className="w-full max-w-md">
        <div className="mb-6 flex items-center gap-3">
          <BrandLogo size={40} />
          <h1 className="text-2xl font-semibold text-ink-heading">
            Warmup Ventures · One Community
          </h1>
        </div>
        <Card>
          <CardHeader>
            <CardTitle>Sign in</CardTitle>
            <CardDescription>
              The OTP sign-in flow lands in Stage 2. This chassis page confirms routing, brand
              tokens, and layout work end-to-end.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {showHint ? (
              <div className="rounded-md border border-brand/30 bg-brand/5 p-3 text-sm text-ink-body">
                Dev mode: OTP is{' '}
                <span className="font-mono font-semibold">{DEV_OTP_BYPASS_CODE}</span> for every
                seeded user.
              </div>
            ) : null}
            <Button className="w-full" disabled>
              Continue — enabled in Stage 2
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
