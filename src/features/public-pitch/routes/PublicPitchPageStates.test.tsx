// UI state tests isolated in their own file so the top-level vi.mock is hoisted
// without affecting the real-API tests in PublicPitchPage.test.tsx.
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { Route, Routes } from 'react-router-dom';
import userEvent from '@testing-library/user-event';
import { fireEvent, waitFor } from '@testing-library/react';
import { renderWithProviders, screen } from '@/test/test-utils';
import { PublicPitchPage } from './PublicPitchPage';

// Hoist the mock so PublicPitchPage imports the spy, not the real function.
vi.mock('@/api/public/pitch', () => ({
  submitPublicPitch: vi.fn(),
}));

// Import the mocked module AFTER vi.mock so we get the spy reference.
import { submitPublicPitch } from '@/api/public/pitch';

beforeEach(() => {
  vi.mocked(submitPublicPitch).mockReset();
});

function renderPage() {
  return renderWithProviders(
    <Routes>
      <Route path="/pitch" element={<PublicPitchPage />} />
    </Routes>,
    { route: '/pitch' },
  );
}

// Fill all required fields (setValueAs coerces strings, so plain value works).
function fillRequired() {
  fireEvent.change(screen.getByTestId('field-company_name'), { target: { value: 'Co' } });
  fireEvent.change(screen.getByTestId('field-city'), { target: { value: 'Bengaluru' } });
  fireEvent.change(screen.getByTestId('field-sector'), { target: { value: 'Tech' } });
  fireEvent.change(screen.getByTestId('field-founder_name'), { target: { value: 'Jane' } });
  fireEvent.change(screen.getByTestId('field-email'), { target: { value: 'a@b.com' } });
  fireEvent.change(screen.getByTestId('field-phone_number'), { target: { value: '9876543210' } });
  fireEvent.change(screen.getByTestId('field-founder_linkedin_url'), {
    target: { value: 'https://linkedin.com/in/jane' },
  });
  fireEvent.change(screen.getByTestId('field-tagline'), { target: { value: 'A tagline here.' } });
  fireEvent.change(screen.getByTestId('field-description'), {
    target: { value: 'A description that is long enough for validation purposes here.' },
  });
  // type="number" inputs need `input` event (not `change`) to trigger React onChange in JSDOM.
  fireEvent.input(screen.getByTestId('field-founding_year'), { target: { value: '2022' } });
  fireEvent.change(screen.getByTestId('field-stage'), { target: { value: 'seed' } });
  fireEvent.change(screen.getByTestId('field-website_url'), {
    target: { value: 'https://testco.com' },
  });
  fireEvent.change(screen.getByTestId('field-deck_url'), {
    target: { value: 'https://drive.google.com/deck' },
  });
}

describe('PublicPitchPage — submission UI states (mocked API)', () => {
  it('shows success card with pitch_id on received', async () => {
    vi.mocked(submitPublicPitch).mockResolvedValue({
      kind: 'success',
      data: { pitch_id: 'pitch-abc', status: 'received', drive_folder_id: null },
    });
    const user = userEvent.setup();
    renderPage();
    fillRequired();
    await user.click(screen.getByTestId('pitch-submit'));
    await screen.findByTestId('pitch-success-card');
    expect(screen.getByTestId('pitch-id')).toHaveTextContent('pitch-abc');
    expect(screen.getByText(/5 business days/i)).toBeInTheDocument();
  });

  it('shows duplicate card on duplicate', async () => {
    vi.mocked(submitPublicPitch).mockResolvedValue({
      kind: 'success',
      data: { pitch_id: 'pitch-dup', status: 'duplicate', drive_folder_id: null },
    });
    const user = userEvent.setup();
    renderPage();
    fillRequired();
    await user.click(screen.getByTestId('pitch-submit'));
    await screen.findByTestId('pitch-success-card');
    expect(screen.getByText(/already have your pitch on file/i)).toBeInTheDocument();
  });

  it('shows rate-limit card on 429', async () => {
    vi.mocked(submitPublicPitch).mockResolvedValue({ kind: 'rate_limited' });
    const user = userEvent.setup();
    renderPage();
    fillRequired();
    await user.click(screen.getByTestId('pitch-submit'));
    await screen.findByTestId('pitch-rate-limited');
    expect(screen.getByText(/3 submissions per hour/i)).toBeInTheDocument();
  });

  it('shows server error on 5xx', async () => {
    vi.mocked(submitPublicPitch).mockResolvedValue({
      kind: 'server_error',
      message: 'Something broke.',
    });
    const user = userEvent.setup();
    renderPage();
    fillRequired();
    await user.click(screen.getByTestId('pitch-submit'));
    await screen.findByTestId('pitch-server-error');
    expect(screen.getByText(/pitch@warmupventures.com/i)).toBeInTheDocument();
  });

  it('maps 422 field errors inline', async () => {
    vi.mocked(submitPublicPitch).mockResolvedValue({
      kind: 'validation_error',
      fieldErrors: { email: 'value is not a valid email address' },
    });
    const user = userEvent.setup();
    renderPage();
    fillRequired();
    await user.click(screen.getByTestId('pitch-submit'));
    await waitFor(() =>
      expect(screen.getByText(/value is not a valid email address/i)).toBeInTheDocument(),
    );
  });
});
