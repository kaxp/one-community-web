import { ExecutionPanel } from '@/components/execution-panel';
import { FormField } from '@/components/forms/FormField';
import { Input } from '@/components/ui/input';
import { useUser } from '@/auth/use-auth';
import { useUpdateHomeCity } from '@/features/travel/hooks/use-update-home-city';
import { zHomeCityForm, type HomeCityForm, type HomeCityResponse } from '@/features/travel/schemas';

// PRD §7.11.4 — single-input ExecutionPanel for home city. After success the
// hook invalidates qk.auth.me and patches authStore.user.home_city; the form
// re-seeds from the user's current value via `defaultValues` on next mount.
export function HomeCityPanel() {
  const user = useUser();
  const mutation = useUpdateHomeCity();
  const current = user?.home_city ?? '';

  return (
    <ExecutionPanel<HomeCityForm, HomeCityResponse>
      title="Your home city"
      description="Used for proximity-based matchmaking. We never share this on your public profile."
      schema={zHomeCityForm}
      defaultValues={{ home_city: current }}
      mutation={mutation}
      submitLabel={current ? 'Update home city' : 'Save home city'}
      onSuccessToast={() => 'Saved'}
      renderForm={({ register, formState }) => (
        <FormField
          label="Home city"
          htmlFor="home-city"
          error={formState.errors.home_city?.message}
          hint="Example: Mumbai, Bengaluru, Delhi"
        >
          <Input
            id="home-city"
            autoComplete="address-level2"
            placeholder="Mumbai"
            {...register('home_city')}
          />
        </FormField>
      )}
    />
  );
}
