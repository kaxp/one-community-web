import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { User } from 'lucide-react';
import { ExecutionPanel } from '@/components/execution-panel';
import { FormField } from '@/components/forms/FormField';
import { Input } from '@/components/ui/input';
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

export function MyProfilePage() {
  const user = useUser();
  const qc = useQueryClient();

  const profileMutation = useCompleteProfile();

  // Refresh auth store after basic profile save
  useEffect(() => {
    if (!profileMutation.isSuccess) return;
    let cancelled = false;
    (async () => {
      try {
        const me = await getMe();
        if (cancelled) return;
        useAuthStore.getState().setUser(profileFromMe(me));
        await qc.invalidateQueries({ queryKey: qk.auth.me });
        toast.success('Profile updated');
      } catch {
        // non-fatal — toast already confirms the save
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profileMutation.isSuccess]);

  return (
    <div className="mx-auto max-w-2xl space-y-8 px-4 py-8">
      <div>
        <h1 className="text-2xl font-semibold text-ink-heading">My Profile</h1>
        <p className="mt-1 text-sm text-ink-muted">
          Update your details at any time. Changes apply immediately.
        </p>
      </div>

      {/* ── Basic profile ───────────────────────────────────────────────── */}
      <section>
        <div className="mb-4 flex items-center gap-2 text-ink-heading">
          <User className="h-4 w-4" aria-hidden />
          <h2 className="font-medium">Basic details</h2>
        </div>
        <ExecutionPanel<ProfileUpdateRequest, ProfileUpdateResponse>
          title=""
          description=""
          schema={zProfileUpdateRequest}
          defaultValues={{
            name: user?.name ?? '',
            email: user?.email ?? '',
            organisation: user?.organisation ?? '',
            designation: user?.designation ?? '',
            linkedin_url: user?.linkedin_url ?? '',
          }}
          mutation={profileMutation}
          submitLabel="Save details"
          renderForm={({ register, formState }) => (
            <div className="grid gap-4 md:grid-cols-2">
              <FormField
                label="Full name"
                htmlFor="my-profile-name"
                error={formState.errors.name?.message}
                className="md:col-span-2"
              >
                <Input id="my-profile-name" placeholder="Your name" {...register('name')} />
              </FormField>
              <FormField
                label="Email"
                htmlFor="my-profile-email"
                error={formState.errors.email?.message}
              >
                <Input
                  id="my-profile-email"
                  type="email"
                  placeholder="you@example.com"
                  {...register('email')}
                />
              </FormField>
              <FormField
                label="Organisation"
                htmlFor="my-profile-org"
                error={formState.errors.organisation?.message}
              >
                <Input
                  id="my-profile-org"
                  placeholder="Warmup Ventures"
                  {...register('organisation')}
                />
              </FormField>
              <FormField
                label="Designation"
                htmlFor="my-profile-designation"
                error={formState.errors.designation?.message}
              >
                <Input
                  id="my-profile-designation"
                  placeholder="Principal"
                  {...register('designation')}
                />
              </FormField>
              <FormField
                label="LinkedIn URL"
                htmlFor="my-profile-linkedin"
                error={formState.errors.linkedin_url?.message}
                className="md:col-span-2"
              >
                <Input
                  id="my-profile-linkedin"
                  placeholder="https://linkedin.com/in/…"
                  {...register('linkedin_url')}
                />
              </FormField>
            </div>
          )}
        />
      </section>
    </div>
  );
}
