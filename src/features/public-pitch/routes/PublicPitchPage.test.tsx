import { describe, expect, it, beforeEach } from 'vitest';
import { Route, Routes } from 'react-router-dom';
import userEvent from '@testing-library/user-event';
import { fireEvent, waitFor } from '@testing-library/react';
import { renderWithProviders, screen } from '@/test/test-utils';
import { PublicPitchPage } from './PublicPitchPage';
import { zPublicPitchForm } from '@/features/public-pitch/schemas';
import { submitPublicPitch } from '@/api/public/pitch';
import {
  setPublicPitchScenario,
  resetPublicPitchState,
} from '@/test/msw-fixtures/public-pitch-handlers';

function renderPage() {
  return renderWithProviders(
    <Routes>
      <Route path="/pitch" element={<PublicPitchPage />} />
    </Routes>,
    { route: '/pitch' },
  );
}

// VALID_PAYLOAD matches PublicPitchInput (API shape — used for submitPublicPitch calls)
const VALID_PAYLOAD = {
  company_name: 'Test Co',
  city: 'Bengaluru',
  sector: 'Fintech',
  founder_name: 'Jane Doe',
  email: 'jane@test.com',
  phone: '+919876543210',
  founder_linkedin_url: 'https://linkedin.com/in/janedoe',
  tagline: 'We fix fintech.',
  description: 'A detailed description of the startup for validation.',
  founding_year: 2022,
  stage: 'seed' as const,
  website_url: 'https://testco.com',
  deck_url: 'https://drive.google.com/deck',
};

// VALID_FORM_DATA matches zPublicPitchForm (RHF form shape)
const VALID_FORM_DATA = {
  company_name: 'Test Co',
  city: 'Bengaluru',
  sector: 'Fintech',
  founder_name: 'Jane Doe',
  email: 'jane@test.com',
  phone_country_code: '+91',
  phone_number: '9876543210',
  founder_linkedin_url: 'https://linkedin.com/in/janedoe',
  tagline: 'We fix fintech.',
  description: 'A detailed description of the startup for validation.',
  founding_year: 2022,
  stage: 'seed' as const,
  website_url: 'https://testco.com',
  deck_url: 'https://drive.google.com/deck',
};

beforeEach(() => {
  resetPublicPitchState();
});

// ── Schema unit tests ─────────────────────────────────────────────────────────
describe('zPublicPitchForm schema', () => {
  it('accepts valid required fields', () => {
    expect(zPublicPitchForm.safeParse(VALID_FORM_DATA).success).toBe(true);
  });

  it('rejects missing company_name', () => {
    expect(zPublicPitchForm.safeParse({ ...VALID_FORM_DATA, company_name: '' }).success).toBe(
      false,
    );
  });

  it('rejects invalid email', () => {
    expect(zPublicPitchForm.safeParse({ ...VALID_FORM_DATA, email: 'not-email' }).success).toBe(
      false,
    );
  });

  it('rejects founding_year in the future', () => {
    expect(
      zPublicPitchForm.safeParse({
        ...VALID_FORM_DATA,
        founding_year: new Date().getFullYear() + 1,
      }).success,
    ).toBe(false);
  });
});

// ── API client unit tests (via MSW — real HTTP) ───────────────────────────────
describe('submitPublicPitch API client', () => {
  it('returns { kind: success, status: received } on 202', async () => {
    setPublicPitchScenario('received');
    const r = await submitPublicPitch(VALID_PAYLOAD);
    expect(r.kind).toBe('success');
    if (r.kind === 'success') expect(r.data.pitch_id).toBe('pitch-fixture-uuid-1234');
  });

  it('returns { kind: success, status: duplicate } on duplicate', async () => {
    setPublicPitchScenario('duplicate');
    const r = await submitPublicPitch(VALID_PAYLOAD);
    expect(r.kind).toBe('success');
    if (r.kind === 'success') expect(r.data.status).toBe('duplicate');
  });

  it('returns { kind: rate_limited } on 429', async () => {
    setPublicPitchScenario('rate_limited');
    const r = await submitPublicPitch(VALID_PAYLOAD);
    expect(r.kind).toBe('rate_limited');
  });

  it('returns { kind: validation_error } with field errors on 422', async () => {
    setPublicPitchScenario('validation_error');
    const r = await submitPublicPitch(VALID_PAYLOAD);
    expect(r.kind).toBe('validation_error');
    if (r.kind === 'validation_error') expect(r.fieldErrors['email']).toMatch(/valid email/i);
  });

  it('returns { kind: server_error } on 503', async () => {
    setPublicPitchScenario('server_error');
    const r = await submitPublicPitch(VALID_PAYLOAD);
    expect(r.kind).toBe('server_error');
  });
});

// ── Component rendering ───────────────────────────────────────────────────────
describe('PublicPitchPage — rendering', () => {
  it('renders the form with the Warmup Ventures header', () => {
    renderPage();
    expect(screen.getByRole('heading', { name: /pitch your startup/i })).toBeInTheDocument();
    expect(screen.getByTestId('pitch-form')).toBeInTheDocument();
  });

  it('shows required field labels', () => {
    renderPage();
    expect(screen.getByLabelText(/company name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
  });
});

// ── Client-side validation ────────────────────────────────────────────────────
describe('PublicPitchPage — client-side validation', () => {
  it('shows required errors when submitted empty', async () => {
    const user = userEvent.setup();
    renderPage();
    await user.click(screen.getByTestId('pitch-submit'));
    await waitFor(() => expect(screen.getAllByRole('alert').length).toBeGreaterThan(0));
    expect(screen.getAllByText(/required/i).length).toBeGreaterThan(0);
  });

  it('validates email format', async () => {
    const user = userEvent.setup();
    renderPage();
    fireEvent.change(screen.getByTestId('field-email'), { target: { value: 'not-an-email' } });
    await user.click(screen.getByTestId('pitch-submit'));
    await waitFor(() => expect(screen.getByText(/valid email/i)).toBeInTheDocument());
  });
});
