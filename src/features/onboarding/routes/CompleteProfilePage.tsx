import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { ExecutionPanel } from '@/components/execution-panel';
import { FormField } from '@/components/forms/FormField';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { BrandLogo } from '@/components/brand/BrandLogo';
import { useCompleteProfile } from '@/features/onboarding/hooks/use-complete-profile';
import {
  zProfileUpdateRequest,
  type ProfileUpdateRequest,
  type ProfileUpdateResponse,
} from '@/features/onboarding/schemas';
import { useUser } from '@/auth/use-auth';
import { getMe } from '@/api/endpoints';
import { qk } from '@/api/query-keys';
import { useAuthStore } from '@/auth/auth-store';
import { profileFromMe } from '@/features/auth/lib/hydrate-session';
import { nextRouteAfterProfile } from '@/features/auth/lib/post-signin-navigate';

export function CompleteProfilePage() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const user = useUser();
  const mutation = useCompleteProfile();

  useEffect(() => {
    if (!mutation.isSuccess) return;
    let cancelled = false;
    (async () => {
      try {
        const me = await getMe();
        if (cancelled) return;
        useAuthStore.getState().setUser(profileFromMe(me));
        await qc.invalidateQueries({ queryKey: qk.auth.me });
        toast.success('Profile saved');
        navigate(nextRouteAfterProfile(me.role), { replace: true });
      } catch {
        // ErrorState inside ExecutionPanel will surface the retry path.
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mutation.isSuccess]);

  const onLogout = () => {
    useAuthStore.getState().clear();
    navigate('/signin', { replace: true });
  };

  return (
    // <main> landmark — onboarding sits outside <AppShell>. Visually-hidden h1
    // gives AT users a clear page title without changing the design (issues.md [A-3]).
    <main className="flex min-h-screen items-start justify-center bg-background px-4 py-12">
      <div className="w-full max-w-xl">
        <h1 className="sr-only">Complete your profile</h1>
        <div className="mb-6 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <BrandLogo size={32} />
            <span className="font-semibold text-ink-heading">One Community</span>
          </div>
          <Button variant="ghost" size="sm" onClick={onLogout}>
            Sign out
          </Button>
        </div>

        <ExecutionPanel<ProfileUpdateRequest, ProfileUpdateResponse>
          title="Complete your profile"
          description="A few details to personalise your experience. You can update these later."
          schema={zProfileUpdateRequest}
          defaultValues={{
            name: user?.name ?? '',
            email: user?.email ?? '',
            organisation: user?.organisation ?? '',
            designation: '',
            linkedin_url: '',
          }}
          mutation={mutation}
          submitLabel="Save profile"
          renderForm={({ register, formState }) => (
            <div className="grid gap-4 md:grid-cols-2">
              <FormField
                label="Full name"
                htmlFor="profile-name"
                error={formState.errors.name?.message}
                className="md:col-span-2"
              >
                <Input id="profile-name" placeholder="Kapil Sahu" {...register('name')} />
              </FormField>
              <FormField
                label="Email"
                htmlFor="profile-email"
                error={formState.errors.email?.message}
              >
                <Input
                  id="profile-email"
                  type="email"
                  placeholder="you@example.com"
                  {...register('email')}
                />
              </FormField>
              <FormField
                label="Organisation"
                htmlFor="profile-org"
                error={formState.errors.organisation?.message}
              >
                <Input
                  id="profile-org"
                  placeholder="Warmup Ventures"
                  {...register('organisation')}
                />
              </FormField>
              <FormField
                label="Designation"
                htmlFor="profile-designation"
                error={formState.errors.designation?.message}
              >
                <Input
                  id="profile-designation"
                  placeholder="Principal"
                  {...register('designation')}
                />
              </FormField>
              <FormField
                label="LinkedIn URL"
                htmlFor="profile-linkedin"
                error={formState.errors.linkedin_url?.message}
                className="md:col-span-2"
              >
                <Input
                  id="profile-linkedin"
                  placeholder="https://linkedin.com/in/…"
                  {...register('linkedin_url')}
                />
              </FormField>
            </div>
          )}
        />
      </div>
    </main>
  );
}
