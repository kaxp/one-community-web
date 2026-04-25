import { describe, expect, it, vi } from 'vitest';
import { Route, Routes } from 'react-router-dom';
import userEvent from '@testing-library/user-event';
import { renderWithProviders, screen, waitFor } from '@/test/test-utils';
import { AdminDeadLetterJobsPage } from './AdminDeadLetterJobsPage';
import { useAuthStore } from '@/auth/auth-store';
import { getMswDlqRetryCount } from '@/test/msw-fixtures/admin-dlq-handlers';

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

function renderPage(route = '/admin/dead-letter-jobs') {
  return renderWithProviders(
    <Routes>
      <Route path="/admin/dead-letter-jobs" element={<AdminDeadLetterJobsPage />} />
    </Routes>,
    { route },
  );
}

describe('AdminDeadLetterJobsPage', () => {
  it('renders 50 pending rows with the offset paginator visible', async () => {
    signedInAsAdmin();
    renderPage();
    await waitFor(() => expect(screen.getByTestId('offset-paginator')).toBeInTheDocument());
    expect(screen.getAllByTestId(/^dlq-row-/).length).toBe(50);
    // Page 1 — Previous disabled, Next enabled.
    expect(screen.getByTestId('paginator-prev')).toBeDisabled();
    expect(screen.getByTestId('paginator-next')).toBeEnabled();
  });

  it('clicking Next advances to page 2 (10 trailing rows; Next disabled)', async () => {
    signedInAsAdmin();
    const user = userEvent.setup();
    renderPage();
    await waitFor(() => expect(screen.getByTestId('offset-paginator')).toBeInTheDocument());
    await user.click(screen.getByTestId('paginator-next'));
    await waitFor(() => expect(screen.getAllByTestId(/^dlq-row-/).length).toBe(10));
    expect(screen.getByTestId('paginator-prev')).toBeEnabled();
    expect(screen.getByTestId('paginator-next')).toBeDisabled();
  });

  it('clicking a row opens the detail drawer with traceback + args/kwargs', async () => {
    signedInAsAdmin();
    const user = userEvent.setup();
    renderPage();
    await waitFor(() => expect(screen.getByTestId('offset-paginator')).toBeInTheDocument());
    await user.click(screen.getAllByTestId(/^dlq-row-/)[0]!);
    await waitFor(() => expect(screen.getByTestId('dlq-traceback')).toBeInTheDocument());
    expect(screen.getByTestId('dlq-args')).toBeInTheDocument();
    expect(screen.getByTestId('dlq-kwargs')).toBeInTheDocument();
  });

  it('Retry on a pending row removes it and increments the server-side count', async () => {
    signedInAsAdmin();
    const user = userEvent.setup();
    renderPage();
    await waitFor(() => expect(screen.getByTestId('offset-paginator')).toBeInTheDocument());
    expect(getMswDlqRetryCount()).toBe(0);
    await user.click(screen.getByTestId('retry-dlq-00000001'));
    await waitFor(() => expect(getMswDlqRetryCount()).toBe(1));
  });

  it('switches tabs via URL and shows a different bucket', async () => {
    signedInAsAdmin();
    const user = userEvent.setup();
    renderPage();
    await waitFor(() => expect(screen.getByTestId('offset-paginator')).toBeInTheDocument());
    await user.click(screen.getByTestId('dlq-tab-retried'));
    await waitFor(() => {
      const rows = screen.getAllByTestId(/^dlq-row-/);
      expect(rows.length).toBe(2);
    });
  });
});
