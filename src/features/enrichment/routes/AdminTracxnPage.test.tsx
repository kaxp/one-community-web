import { describe, expect, it, vi } from 'vitest';
import { Route, Routes } from 'react-router-dom';
import userEvent from '@testing-library/user-event';
import { renderWithProviders, screen, waitFor } from '@/test/test-utils';
import { AdminTracxnPage } from './AdminTracxnPage';
import { useAuthStore } from '@/auth/auth-store';
import { setMswTracxnForcedAction } from '@/test/msw-fixtures/admin-tracxn-handlers';
import { toast } from 'sonner';

vi.mock('sonner', async () => {
  const actual = await vi.importActual<typeof import('sonner')>('sonner');
  return {
    ...actual,
    toast: {
      ...actual.toast,
      success: vi.fn(),
      error: vi.fn(),
    },
  };
});

function signedInAsAdmin() {
  useAuthStore.getState().setSession({
    token: 'msw-jwt.test',
    user: {
      id: '00000000-0000-4000-8000-000000000002',
      phone: '+911234567890',
      role: 'admin',
      name: 'Admin',
      email: null,
      organisation: null,
      profile_complete: true,
    },
    expiresAt: Date.now() + 60 * 60_000,
  });
}

function renderPage() {
  return renderWithProviders(
    <Routes>
      <Route path="/admin/tracxn" element={<AdminTracxnPage />} />
    </Routes>,
    { route: '/admin/tracxn' },
  );
}

describe('AdminTracxnPage', () => {
  it('toasts "Added {company_name}" on action=created', async () => {
    signedInAsAdmin();
    const successSpy = vi.mocked(toast.success);
    successSpy.mockClear();
    const user = userEvent.setup();
    renderPage();

    await user.type(screen.getByLabelText(/Company name/i), 'Acme Technologies');
    await user.click(screen.getByRole('button', { name: /Submit/i }));

    await waitFor(() =>
      expect(successSpy).toHaveBeenCalledWith(expect.stringContaining('Added Acme Technologies')),
    );
  });

  it('toasts "Updated N fields on {company_name}" on action=merged', async () => {
    signedInAsAdmin();
    setMswTracxnForcedAction('merged');
    const successSpy = vi.mocked(toast.success);
    successSpy.mockClear();
    const user = userEvent.setup();
    renderPage();

    await user.type(screen.getByLabelText(/Company name/i), 'NeoLedger');
    await user.click(screen.getByRole('button', { name: /Submit/i }));

    await waitFor(() =>
      expect(successSpy).toHaveBeenCalledWith(
        expect.stringMatching(/Updated 3 fields on NeoLedger/i),
      ),
    );
  });

  it('toasts "Already exists" on action=duplicate_skipped', async () => {
    signedInAsAdmin();
    setMswTracxnForcedAction('duplicate_skipped');
    const successSpy = vi.mocked(toast.success);
    successSpy.mockClear();
    const user = userEvent.setup();
    renderPage();

    await user.type(screen.getByLabelText(/Company name/i), 'OldCo');
    await user.click(screen.getByRole('button', { name: /Submit/i }));

    await waitFor(() =>
      expect(successSpy).toHaveBeenCalledWith(expect.stringContaining('Already exists')),
    );
  });
});
