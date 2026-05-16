// TODO(kaxp): OTP flow is bypassed for now — auto-verify with 000000 after phone submit.
// Tests updated to reflect the simplified single-step sign-in.
// Original 2-step tests (phone → OTP boxes) removed; restore when OTP flow is re-enabled.
import { describe, expect, it, vi } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '@/test/test-utils';
import { SignInPage } from './SignInPage';
import { useAuthStore } from '@/auth/auth-store';
import { setMswProfileComplete, queueOtpVerifyError } from '@/test/msw-fixtures/auth-handlers';

const navigateMock = vi.fn();

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return { ...actual, useNavigate: () => navigateMock };
});

describe('SignInPage integration', () => {
  it('enters phone → auto-verifies → navigates to /dashboard (P-18 + TODO kaxp OTP bypass)', async () => {
    navigateMock.mockReset();
    const user = userEvent.setup();
    renderWithProviders(<SignInPage />);

    await user.type(screen.getByLabelText(/mobile number/i), '1234567892');
    await user.click(screen.getByRole('button', { name: /sign in/i }));

    await waitFor(() => {
      expect(navigateMock).toHaveBeenCalledWith('/dashboard', { replace: true });
    });
    const state = useAuthStore.getState();
    expect(state.role).toBe('lp');
    expect(state.user?.profile_complete).toBe(true);
  });

  it('skips profile completion — incomplete-profile user still lands on /dashboard (TODO kaxp)', async () => {
    // Profile gate redirect is commented out; all users go to /dashboard regardless.
    navigateMock.mockReset();
    setMswProfileComplete('+911234567892', false);
    const user = userEvent.setup();
    renderWithProviders(<SignInPage />);

    await user.type(screen.getByLabelText(/mobile number/i), '1234567892');
    await user.click(screen.getByRole('button', { name: /sign in/i }));

    await waitFor(() => {
      expect(navigateMock).toHaveBeenCalledWith('/dashboard', { replace: true });
    });
  });

  it('shows inline error when verification fails (unregistered or rejected phone)', async () => {
    navigateMock.mockReset();
    queueOtpVerifyError({ status: 401, code: 'otp_invalid', message: 'Invalid OTP' });
    const user = userEvent.setup();
    renderWithProviders(<SignInPage />);

    await user.type(screen.getByLabelText(/mobile number/i), '1234567892');
    await user.click(screen.getByRole('button', { name: /sign in/i }));

    await screen.findByText(/code is incorrect/i);
    expect(navigateMock).not.toHaveBeenCalled();
  });
});
