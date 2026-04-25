import { describe, expect, it, vi } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '@/test/test-utils';
import { SignInPage } from './SignInPage';
import { useAuthStore } from '@/auth/auth-store';
import { setMswProfileComplete } from '@/test/msw-fixtures/auth-handlers';

const navigateMock = vi.fn();

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return { ...actual, useNavigate: () => navigateMock };
});

describe('SignInPage integration', () => {
  it('completes phone → OTP → /auth/me and navigates every role to /dashboard (P-18)', async () => {
    navigateMock.mockReset();
    const user = userEvent.setup();
    renderWithProviders(<SignInPage />);

    await user.type(screen.getByLabelText(/mobile number/i), '1234567892');
    await user.click(screen.getByRole('button', { name: /send otp/i }));

    const otpBoxes = await screen.findAllByLabelText(/digit \d of 6/i);
    expect(otpBoxes).toHaveLength(6);

    for (const ch of '000000') {
      const active = document.activeElement as HTMLInputElement | null;
      await user.type(active ?? otpBoxes[0]!, ch);
    }

    await waitFor(() => {
      expect(navigateMock).toHaveBeenCalledWith('/dashboard', { replace: true });
    });
    const state = useAuthStore.getState();
    expect(state.role).toBe('lp');
    expect(state.user?.profile_complete).toBe(true);
  });

  it('routes an incomplete-profile user to /onboarding/profile', async () => {
    navigateMock.mockReset();
    setMswProfileComplete('+911234567892', false);
    const user = userEvent.setup();
    renderWithProviders(<SignInPage />);

    await user.type(screen.getByLabelText(/mobile number/i), '1234567892');
    await user.click(screen.getByRole('button', { name: /send otp/i }));

    const otpBoxes = await screen.findAllByLabelText(/digit \d of 6/i);
    for (const ch of '000000') {
      const active = document.activeElement as HTMLInputElement | null;
      await user.type(active ?? otpBoxes[0]!, ch);
    }

    await waitFor(() => {
      expect(navigateMock).toHaveBeenCalledWith('/onboarding/profile', { replace: true });
    });
  });

  it('shows inline error on wrong OTP and clears the field', async () => {
    navigateMock.mockReset();
    const user = userEvent.setup();
    renderWithProviders(<SignInPage />);

    await user.type(screen.getByLabelText(/mobile number/i), '1234567892');
    await user.click(screen.getByRole('button', { name: /send otp/i }));

    const otpBoxes = await screen.findAllByLabelText(/digit \d of 6/i);
    for (const ch of '111111') {
      const active = document.activeElement as HTMLInputElement | null;
      await user.type(active ?? otpBoxes[0]!, ch);
    }

    await screen.findByText(/code is incorrect/i);
    expect(navigateMock).not.toHaveBeenCalled();
  });
});
