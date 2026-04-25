import { describe, expect, it, vi, beforeEach } from 'vitest';
import { Route, Routes } from 'react-router-dom';
import userEvent from '@testing-library/user-event';
import { renderWithProviders, screen, waitFor } from '@/test/test-utils';
import { AddUserPage } from './AddUserPage';
import { useAuthStore } from '@/auth/auth-store';
import {
  queueCardScanConfirmError,
  setMswCardScanCreatesUser,
  setMswCardScanParsed,
} from '@/test/msw-fixtures/onboarding-handlers';
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

// Mock the OCR interim service so the page test doesn't actually run
// tesseract.js. We exercise the dropzone path indirectly via the paste
// textarea, since jsdom + react-dropzone's drop-event simulation is
// fragile and the OCR hook has its own dedicated test file.
const recognizeMock = vi.hoisted(() => vi.fn());
vi.mock('@/api/interim/ocr-client', () => ({
  OCRServiceInterim: { recognize: recognizeMock },
}));

beforeEach(() => {
  recognizeMock.mockReset();
});

function signedInAsLP() {
  useAuthStore.getState().setSession({
    token: 'msw-jwt.test',
    user: {
      id: '00000000-0000-4000-8000-000000000004',
      phone: '+911234567892',
      role: 'lp',
      name: 'LP',
      email: null,
      organisation: null,
      profile_complete: true,
    },
    expiresAt: Date.now() + 60 * 60_000,
  });
}

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
      <Route path="/add-user" element={<AddUserPage />} />
      <Route path="/profile/:id" element={<div data-testid="profile-page" />} />
    </Routes>,
    { route: '/add-user' },
  );
}

const RAW = 'Kapil Sahu\nPrincipal, Warmup Ventures\n+91-9876543210\nkapil@example.com';

describe('AddUserPage', () => {
  it('renders the dropzone + paste textarea on mount', async () => {
    signedInAsLP();
    renderPage();

    expect(screen.getByText(/Drop a card image/i)).toBeInTheDocument();
    expect(screen.getByTestId('add-user-raw-input')).toBeInTheDocument();
  });

  it('paste flow: typing OCR text + Parse → review form prefills with parsed values', async () => {
    signedInAsLP();
    const user = userEvent.setup();
    renderPage();

    await user.type(screen.getByTestId('add-user-raw-input'), RAW);
    await user.click(screen.getByTestId('add-user-parse-paste'));

    await waitFor(() => expect(screen.getByText(/Confirm contact details/i)).toBeInTheDocument());
    expect((screen.getByLabelText(/Full name/i) as HTMLInputElement).value).toContain('Kapil');
    expect((screen.getByLabelText(/Phone/i) as HTMLInputElement).value).toContain('+919876543210');
  });

  it('flags missing required fields red and null parsed fields amber', async () => {
    signedInAsLP();
    setMswCardScanParsed({ name: null, phone: null, organisation: null });
    const user = userEvent.setup();
    renderPage();

    await user.type(screen.getByTestId('add-user-raw-input'), RAW);
    await user.click(screen.getByTestId('add-user-parse-paste'));

    await waitFor(() => expect(screen.getByText(/Confirm contact details/i)).toBeInTheDocument());

    // Two missing-required flags + one low-confidence amber.
    expect(screen.getAllByText(/Missing — required/i).length).toBe(2);
    expect(screen.getAllByText(/Low confidence/i).length).toBeGreaterThan(0);
  });

  it('submit success: toasts "user created" and resets to upload', async () => {
    signedInAsLP();
    const successSpy = vi.mocked(toast.success);
    successSpy.mockClear();
    const user = userEvent.setup();
    renderPage();

    await user.type(screen.getByTestId('add-user-raw-input'), RAW);
    await user.click(screen.getByTestId('add-user-parse-paste'));

    await waitFor(() => expect(screen.getByText(/Confirm contact details/i)).toBeInTheDocument());
    await user.click(screen.getByTestId('add-user-submit'));

    await waitFor(() =>
      expect(successSpy).toHaveBeenCalledWith(expect.stringContaining('user created')),
    );
    // Page returns to the upload step.
    await waitFor(() => expect(screen.getByText(/Upload card image/i)).toBeInTheDocument());
  });

  it('submit success when user_created=false: toasts the admin-followup copy', async () => {
    signedInAsLP();
    setMswCardScanCreatesUser(false);
    const successSpy = vi.mocked(toast.success);
    successSpy.mockClear();
    const user = userEvent.setup();
    renderPage();

    await user.type(screen.getByTestId('add-user-raw-input'), RAW);
    await user.click(screen.getByTestId('add-user-parse-paste'));

    await waitFor(() => expect(screen.getByText(/Confirm contact details/i)).toBeInTheDocument());
    await user.click(screen.getByTestId('add-user-submit'));

    await waitFor(() =>
      expect(successSpy).toHaveBeenCalledWith(expect.stringContaining('admin will follow up')),
    );
  });

  it('409 duplicate_contact opens the modal with admin-only "Open existing user" CTA', async () => {
    signedInAsAdmin();
    const user = userEvent.setup();
    renderPage();

    await user.type(screen.getByTestId('add-user-raw-input'), RAW);
    await user.click(screen.getByTestId('add-user-parse-paste'));

    await waitFor(() => expect(screen.getByText(/Confirm contact details/i)).toBeInTheDocument());

    // Queue the duplicate AFTER the initial parse already succeeded.
    queueCardScanConfirmError({
      status: 409,
      code: 'duplicate_contact',
      message: 'A contact with this phone or email already exists',
      detail: { existing_user_id: '0f3c0b0a-e6cc-4f1c-9a2e-a5b2e3f1c9d0' },
    });

    await user.click(screen.getByTestId('add-user-submit'));

    await waitFor(() =>
      expect(screen.getByRole('dialog', { name: /Already in the community/i })).toBeInTheDocument(),
    );
    // Admin sees both buttons.
    expect(screen.getByRole('button', { name: /Open existing user/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Cancel/i })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /Open existing user/i }));
    await waitFor(() => expect(screen.getByTestId('profile-page')).toBeInTheDocument());
  });

  it('409 duplicate_contact for a non-admin (LP) hides the "Open existing user" CTA', async () => {
    signedInAsLP();
    const user = userEvent.setup();
    renderPage();

    await user.type(screen.getByTestId('add-user-raw-input'), RAW);
    await user.click(screen.getByTestId('add-user-parse-paste'));

    await waitFor(() => expect(screen.getByText(/Confirm contact details/i)).toBeInTheDocument());

    queueCardScanConfirmError({
      status: 409,
      code: 'duplicate_contact',
      message: 'A contact with this phone or email already exists',
      detail: { existing_user_id: '0f3c0b0a-e6cc-4f1c-9a2e-a5b2e3f1c9d0' },
    });

    await user.click(screen.getByTestId('add-user-submit'));

    await waitFor(() =>
      expect(screen.getByRole('dialog', { name: /Already in the community/i })).toBeInTheDocument(),
    );
    expect(screen.queryByRole('button', { name: /Open existing user/i })).not.toBeInTheDocument();
  });
});
