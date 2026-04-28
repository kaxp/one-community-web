import { expect, type Page } from '@playwright/test';

// Stage 5.5 e2e helpers. Drives the signed-in OTP flow once via the actual
// UI for full-stack coverage, plus a faster `seedAuth` path for cross-user
// switches inside a single spec (the prompt allows direct auth-store
// mutation since real signin per user is heavy).

export type SeedRole =
  | 'lp'
  | 'potential_lp'
  | 'vc'
  | 'startup_funded'
  | 'startup_inprogress'
  | 'startup_onboarded'
  | 'partner'
  | 'advisor'
  | 'admin'
  | 'super_admin';

interface SeedUser {
  phone: string;
  user_id: string;
  name: string;
  email: string;
  role: SeedRole;
}

// Mirrors `src/lib/dev-seed-users.ts` + `src/test/msw-fixtures/seed-users.ts`.
// Kept as a literal so the e2e package has zero src/ imports (Playwright runs
// outside the Vite module graph).
export const SEED_USERS: Record<SeedRole, SeedUser> = {
  admin: {
    phone: '+918087464723',
    user_id: '00000000-0000-4000-8000-000000000001',
    name: 'Kapil',
    email: 'kapil@warmupventures.com',
    role: 'admin',
  },
  super_admin: {
    phone: '+911234567891',
    user_id: '00000000-0000-4000-8000-000000000003',
    name: 'Super Admin Dev',
    email: 'superadmin@warmupventures.com',
    role: 'super_admin',
  },
  lp: {
    phone: '+911234567892',
    user_id: '00000000-0000-4000-8000-000000000004',
    name: 'LP Test User',
    email: 'lp@test.com',
    role: 'lp',
  },
  potential_lp: {
    phone: '+911234567893',
    user_id: '00000000-0000-4000-8000-000000000005',
    name: 'Potential LP User',
    email: 'potentiallp@test.com',
    role: 'potential_lp',
  },
  startup_funded: {
    phone: '+911234567894',
    user_id: '00000000-0000-4000-8000-000000000005',
    name: 'Funded Startup User',
    email: 'startup@test.com',
    role: 'startup_funded',
  },
  startup_inprogress: {
    phone: '+911234567895',
    user_id: '00000000-0000-4000-8000-000000000007',
    name: 'InProgress Startup',
    email: 'startup-ip@test.com',
    role: 'startup_inprogress',
  },
  vc: {
    phone: '+911234567896',
    user_id: '00000000-0000-4000-8000-000000000008',
    name: 'VC Test User',
    email: 'vc@test.com',
    role: 'vc',
  },
  partner: {
    phone: '+911234567897',
    user_id: '00000000-0000-4000-8000-000000000009',
    name: 'Partner User',
    email: 'partner@test.com',
    role: 'partner',
  },
  advisor: {
    phone: '+911234567898',
    user_id: '00000000-0000-4000-8000-00000000000a',
    name: 'Advisor User',
    email: 'advisor@test.com',
    role: 'advisor',
  },
  startup_onboarded: {
    phone: '+911234567899',
    user_id: '00000000-0000-4000-8000-00000000000b',
    name: 'Onboarded Startup',
    email: 'onboarded@test.com',
    role: 'startup_onboarded',
  },
};

const OTP_BYPASS = '000000';

// Drive the real two-step signin flow (phone → OTP) end-to-end.
// Use this for the spec under test. For cross-user switches inside a single
// spec, prefer `seedAuth` for speed.
export async function signin(page: Page, role: SeedRole): Promise<SeedUser> {
  const seed = SEED_USERS[role];
  await page.goto('/signin');
  await page.locator('#signin-phone').waitFor({ state: 'visible' });
  await page.locator('#signin-phone').fill(seed.phone);
  await page.getByRole('button', { name: /send otp/i }).click();

  // OTP cells render lazily after the send-otp mutation resolves.
  const otpCells = page.locator('#signin-otp input');
  await otpCells.first().waitFor({ state: 'visible' });
  // Fill one digit per cell. NOTE: SignInPage auto-submits the verify
  // mutation as soon as `otp.length === 6`, so the explicit "Verify &
  // continue" click is redundant — and trying to click the button after
  // the 6th digit lands races against the navigation away to /dashboard.
  for (let i = 0; i < OTP_BYPASS.length; i += 1) {
    await otpCells.nth(i).fill(OTP_BYPASS[i]!);
  }
  // Per [P-18] every signed-in user lands on /dashboard.
  await page.waitForURL('**/dashboard', { timeout: 15_000 });
  return seed;
}

// Bypass the signin flow by writing directly to the persisted auth-store.
// Use this for cross-user switches (e.g. LP requests connection → switch to
// admin to approve). Mirrors `setSession` shape (zustand persist version 1).
export async function seedAuth(page: Page, role: SeedRole): Promise<SeedUser> {
  const seed = SEED_USERS[role];
  // Build a base64url(phone) → mock JWT (mirrors `mintMswToken` from
  // `src/test/msw-fixtures/auth-handlers.ts`).
  const phone = seed.phone;
  const token = await page.evaluate((p: string) => {
    const b64 = btoa(p);
    const url = b64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
    return `msw-jwt.${url}`;
  }, phone);

  const expiresAt = Date.now() + 4 * 60 * 60_000;
  const persisted = {
    state: {
      token,
      user: {
        id: seed.user_id,
        phone: seed.phone,
        role: seed.role,
        name: seed.name,
        email: seed.email,
        organisation: null,
        profile_complete: true,
      },
      role: seed.role,
      expiresAt,
    },
    version: 1,
  };

  await page.addInitScript((p: string) => {
    localStorage.setItem('oc.auth', p);
  }, JSON.stringify(persisted));

  // For tabs already open, also write directly so the next reload picks it up.
  await page.evaluate((p: string) => localStorage.setItem('oc.auth', p), JSON.stringify(persisted));
  return seed;
}

// Useful in afterEach to fully reset session state between specs.
export async function clearAuth(page: Page): Promise<void> {
  await page.evaluate(() => {
    try {
      localStorage.removeItem('oc.auth');
    } catch {
      // ignore
    }
  });
}

// Assert no console errors fired during the test run. Attach via
// `page.on('console', collect)` per spec.
export function attachConsoleErrorCollector(page: Page): { errors: string[] } {
  const errors: string[] = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      const text = msg.text();
      // Filter common dev-mode noise from React Refresh / Vite that isn't
      // app-level.
      if (text.includes('[vite]') || text.includes('Download the React DevTools')) return;
      errors.push(text);
    }
  });
  page.on('pageerror', (err) => {
    errors.push(`pageerror: ${err.message}`);
  });
  return { errors };
}

// Convenience matcher used by several specs.
export async function expectNoConsoleErrors(errors: string[]): Promise<void> {
  expect(errors, `Console errors during test:\n${errors.join('\n')}`).toEqual([]);
}
