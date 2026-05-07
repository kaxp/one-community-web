import { describe, expect, it, vi, beforeEach } from 'vitest';
import { Route, Routes } from 'react-router-dom';
import userEvent from '@testing-library/user-event';
import { fireEvent } from '@testing-library/react';
import { renderWithProviders, screen, waitFor } from '@/test/test-utils';
import { AddUserPage } from './AddUserPage';
import { useAuthStore } from '@/auth/auth-store';
import {
  queueCardScanConfirmError,
  setMswCardScanCreatesUser,
  setMswCardScanParsed,
  setMswCardScanPendingApproval,
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
// tesseract.js. We trigger the camera input with a File object so jsdom
// doesn't need to simulate a dropzone drop event (which is fragile).
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

/** Fire a change event on the hidden camera input to simulate a file pick. */
function uploadViaCamera(file: File) {
  const cameraInput = screen.getByTestId('add-user-camera-input');
  fireEvent.change(cameraInput, { target: { files: [file] } });
}

describe('AddUserPage', () => {
  it('renders the autofill card and contact form on mount', async () => {
    signedInAsLP();
    renderPage();

    expect(screen.getByText(/Autofill from business card/i)).toBeInTheDocument();
    expect(screen.getByText(/Drop a card image or click to upload/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Full name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Phone/i)).toBeInTheDocument();
  });

  it('camera scan: OCR + parse → form prefills with parsed values', async () => {
    signedInAsLP();
    recognizeMock.mockResolvedValue({ raw_text: RAW, confidence: 0.95 });
    renderPage();

    uploadViaCamera(new File(['content'], 'card.jpg', { type: 'image/jpeg' }));

    await waitFor(() =>
      expect(screen.getByText(/Card scanned — form autofilled below/i)).toBeInTheDocument(),
    );
    expect((screen.getByLabelText(/Full name/i) as HTMLInputElement).value).toContain('Kapil');
    expect((screen.getByLabelText(/Phone/i) as HTMLInputElement).value).toContain('+919876543210');
  });

  it('flags missing required fields red and null parsed fields amber', async () => {
    signedInAsLP();
    setMswCardScanParsed({ name: null, phone: null, organisation: null });
    recognizeMock.mockResolvedValue({ raw_text: RAW, confidence: 0.95 });
    renderPage();

    uploadViaCamera(new File(['content'], 'card.jpg', { type: 'image/jpeg' }));

    await waitFor(() =>
      expect(screen.getByText(/Card scanned — form autofilled below/i)).toBeInTheDocument(),
    );

    // Two missing-required flags (name + phone) + one low-confidence amber (organisation).
    expect(screen.getAllByText(/Missing — required/i).length).toBe(2);
    expect(screen.getAllByText(/Low confidence/i).length).toBeGreaterThan(0);
  });

  it('submit success: toasts "user created" and resets the form', async () => {
    signedInAsLP();
    const successSpy = vi.mocked(toast.success);
    successSpy.mockClear();
    const user = userEvent.setup();
    renderPage();

    await user.type(screen.getByLabelText(/Full name/i), 'Kapil Sahu');
    await user.type(screen.getByLabelText(/Phone/i), '+919876543210');
    await user.click(screen.getByTestId('add-user-submit'));

    await waitFor(() =>
      expect(successSpy).toHaveBeenCalledWith(expect.stringContaining('user created')),
    );
    // After reset, scan inputs reappear (parsed is cleared).
    await waitFor(() => expect(screen.getByTestId('add-user-camera-button')).toBeInTheDocument());
  });

  it('submit success with pending_approval: toasts referral-submitted copy', async () => {
    signedInAsLP();
    setMswCardScanCreatesUser(false);
    setMswCardScanPendingApproval(true);
    const successSpy = vi.mocked(toast.success);
    successSpy.mockClear();
    const user = userEvent.setup();
    renderPage();

    await user.type(screen.getByLabelText(/Full name/i), 'Kapil Sahu');
    await user.type(screen.getByLabelText(/Phone/i), '+919876543210');
    await user.click(screen.getByTestId('add-user-submit'));

    await waitFor(() =>
      expect(successSpy).toHaveBeenCalledWith(expect.stringContaining('Referral submitted')),
    );
  });

  it('409 duplicate_contact opens the modal with admin-only "Open existing user" CTA', async () => {
    signedInAsAdmin();
    const user = userEvent.setup();
    renderPage();

    await user.type(screen.getByLabelText(/Full name/i), 'Kapil Sahu');
    await user.type(screen.getByLabelText(/Phone/i), '+919876543210');

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

    await user.type(screen.getByLabelText(/Full name/i), 'Kapil Sahu');
    await user.type(screen.getByLabelText(/Phone/i), '+919876543210');

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
