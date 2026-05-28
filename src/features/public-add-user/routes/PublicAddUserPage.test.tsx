import { beforeEach, describe, expect, it } from 'vitest';
import { Route, Routes } from 'react-router-dom';
import userEvent from '@testing-library/user-event';
import { waitFor } from '@testing-library/react';
import { renderWithProviders, screen } from '@/test/test-utils';
import { PublicAddUserPage } from './PublicAddUserPage';
import { zPublicAddUserForm } from '@/features/public-add-user/schemas';
import { submitPublicAddUser } from '@/api/public/add-user';
import {
  setPublicAddUserScenario,
  resetPublicAddUserState,
  getLastPublicAddUserBody,
} from '@/test/msw-fixtures/public-add-user-handlers';

function renderPage() {
  return renderWithProviders(
    <Routes>
      <Route path="/join" element={<PublicAddUserPage />} />
    </Routes>,
    { route: '/join' },
  );
}

const VALID_PAYLOAD = {
  name: 'Anand',
  email: 'anand@example.com',
  role: 'lp' as const,
};

beforeEach(() => {
  resetPublicAddUserState();
});

// ── Schema unit tests ─────────────────────────────────────────────────────────
describe('zPublicAddUserForm schema', () => {
  it('accepts minimal required fields', () => {
    expect(zPublicAddUserForm.safeParse(VALID_PAYLOAD).success).toBe(true);
  });

  it('rejects missing name', () => {
    expect(zPublicAddUserForm.safeParse({ ...VALID_PAYLOAD, name: '' }).success).toBe(false);
  });

  it('rejects invalid email', () => {
    expect(zPublicAddUserForm.safeParse({ ...VALID_PAYLOAD, email: 'not-email' }).success).toBe(
      false,
    );
  });

  it('rejects role outside the allowed set', () => {
    // Cast to bypass TS narrowing — we want runtime validation here.
    expect(
      zPublicAddUserForm.safeParse({
        ...VALID_PAYLOAD,
        role: 'ceo' as unknown as 'lp',
      }).success,
    ).toBe(false);
  });

  it('strips blank optional fields', () => {
    const parsed = zPublicAddUserForm.safeParse({
      ...VALID_PAYLOAD,
      phone: '',
      organisation: '',
      linkedin_url: '',
      city: '',
      message: '',
    });
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      // Empty strings transformed to undefined so backend doesn't see them.
      expect(parsed.data.phone).toBeUndefined();
      expect(parsed.data.organisation).toBeUndefined();
      expect(parsed.data.linkedin_url).toBeUndefined();
    }
  });

  it('rejects malformed LinkedIn URL', () => {
    expect(
      zPublicAddUserForm.safeParse({ ...VALID_PAYLOAD, linkedin_url: 'not-a-url' }).success,
    ).toBe(false);
  });
});

// ── API client unit tests (via MSW) ───────────────────────────────────────────
describe('submitPublicAddUser API client', () => {
  it('returns { kind: success } on 202', async () => {
    setPublicAddUserScenario('received');
    const r = await submitPublicAddUser(VALID_PAYLOAD);
    expect(r.kind).toBe('success');
    if (r.kind === 'success') expect(r.data.signup_id).toBe('signup-fixture-uuid-1234');
  });

  it('returns { kind: rate_limited } on 429', async () => {
    setPublicAddUserScenario('rate_limited');
    const r = await submitPublicAddUser(VALID_PAYLOAD);
    expect(r.kind).toBe('rate_limited');
  });

  it('returns { kind: invalid_email } on 400 with invalid_email code', async () => {
    setPublicAddUserScenario('invalid_email');
    const r = await submitPublicAddUser(VALID_PAYLOAD);
    expect(r.kind).toBe('invalid_email');
  });

  it('returns { kind: validation_error } with per-field messages on 422', async () => {
    setPublicAddUserScenario('validation_error');
    const r = await submitPublicAddUser(VALID_PAYLOAD);
    expect(r.kind).toBe('validation_error');
    if (r.kind === 'validation_error') {
      expect(r.fieldErrors.name).toBeTruthy();
      expect(r.fieldErrors.role).toBeTruthy();
    }
  });

  it('returns { kind: server_error } on 503', async () => {
    setPublicAddUserScenario('server_error');
    const r = await submitPublicAddUser(VALID_PAYLOAD);
    expect(r.kind).toBe('server_error');
  });
});

// ── Page integration tests ────────────────────────────────────────────────────
describe('PublicAddUserPage', () => {
  it('renders the form with role select + required fields', async () => {
    renderPage();
    expect(await screen.findByTestId('signup-form')).toBeInTheDocument();
    expect(screen.getByTestId('field-name')).toBeInTheDocument();
    expect(screen.getByTestId('field-email')).toBeInTheDocument();
    expect(screen.getByTestId('field-role')).toBeInTheDocument();
  });

  it('shows the success card on 202 and surfaces signup_id', async () => {
    setPublicAddUserScenario('received');
    renderPage();
    const user = userEvent.setup();

    await user.type(await screen.findByTestId('field-name'), 'Anand');
    await user.type(screen.getByTestId('field-email'), 'anand@example.com');
    await user.selectOptions(screen.getByTestId('field-role'), 'lp');
    await user.click(screen.getByTestId('signup-submit'));

    await waitFor(() => {
      expect(screen.getByTestId('signup-success-card')).toBeInTheDocument();
    });
    expect(screen.getByTestId('signup-id').textContent).toBe('signup-fixture-uuid-1234');

    // Sent body matches what the user filled out
    const body = getLastPublicAddUserBody() as Record<string, unknown>;
    expect(body.name).toBe('Anand');
    expect(body.email).toBe('anand@example.com');
    expect(body.role).toBe('lp');
  });

  it('shows the rate-limited card on 429', async () => {
    setPublicAddUserScenario('rate_limited');
    renderPage();
    const user = userEvent.setup();

    await user.type(await screen.findByTestId('field-name'), 'Anand');
    await user.type(screen.getByTestId('field-email'), 'anand@example.com');
    await user.selectOptions(screen.getByTestId('field-role'), 'lp');
    await user.click(screen.getByTestId('signup-submit'));

    await waitFor(() => {
      expect(screen.getByTestId('signup-rate-limited')).toBeInTheDocument();
    });
  });

  it('attaches field errors from a 422 to the form', async () => {
    setPublicAddUserScenario('validation_error');
    renderPage();
    const user = userEvent.setup();

    await user.type(await screen.findByTestId('field-name'), 'Anand');
    await user.type(screen.getByTestId('field-email'), 'anand@example.com');
    await user.selectOptions(screen.getByTestId('field-role'), 'lp');
    await user.click(screen.getByTestId('signup-submit'));

    await waitFor(() => {
      // Both fixture errors (name + role) surface; assert two matches.
      const messages = screen.getAllByText('field required');
      expect(messages.length).toBeGreaterThanOrEqual(2);
    });
  });

  it('blocks submission when email is malformed (client-side Zod gate)', async () => {
    renderPage();
    const user = userEvent.setup();

    await user.type(await screen.findByTestId('field-name'), 'Anand');
    await user.type(screen.getByTestId('field-email'), 'not-email');
    await user.selectOptions(screen.getByTestId('field-role'), 'lp');
    await user.click(screen.getByTestId('signup-submit'));

    // No request fired — success card never appears
    expect(screen.queryByTestId('signup-success-card')).not.toBeInTheDocument();
    expect(await screen.findByText('Enter a valid email address')).toBeInTheDocument();
  });
});
