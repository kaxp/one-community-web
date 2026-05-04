import { test, expect, type Page } from '@playwright/test';
import { seedAuth } from './_helpers';

// Stage 6 S7 — role-isolation nav smoke.
//
// Verifies that the sidebar shows exactly the right items per role, and that
// participant-only links never appear for admin and vice-versa.
//
// Uses `seedAuth` (localStorage injection + reload) rather than the full OTP
// flow so four role checks complete without re-running signin four times.
//
// Why the beforeEach: `seedAuth` calls page.evaluate() to write to
// localStorage. That call fails with a SecurityError when the page is at
// about:blank (no origin). Navigating to '/' first and waiting for the MSW
// service worker gives page.evaluate a real document to run against.
//
// Why we scope to the Primary nav: the page content (dashboard KPI cards, etc.)
// can contain links with the same label as sidebar items (e.g. "MIS overview"
// appears in both the AdminDashboard KPI card and the sidebar). Scoping via
// getByRole('navigation', { name: 'Primary' }) avoids strict-mode violations
// from duplicate matches.

async function primaryNav(page: Page) {
  return page.getByRole('navigation', { name: 'Primary' });
}

test.describe('Role-nav isolation smoke (Stage 6)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    // Wait for the MSW service worker to become the active controller before
    // seedAuth tries to write localStorage and before we load /dashboard.
    await page.waitForFunction(
      () => navigator.serviceWorker && navigator.serviceWorker.controller !== null,
      { timeout: 30_000 },
    );
  });

  // ──────────────────────────────────────────────────────────────────
  // Admin
  // ──────────────────────────────────────────────────────────────────
  test('admin sees admin nav items and NOT participant items', async ({ page }) => {
    await seedAuth(page, 'admin');
    await page.goto('/dashboard');
    await page.waitForURL('**/dashboard');

    const nav = await primaryNav(page);

    // Must be present
    await expect(nav.getByRole('link', { name: /^Dashboard$/i })).toBeVisible();
    await expect(nav.getByRole('link', { name: /^Search$/i })).toBeVisible();
    await expect(nav.getByRole('link', { name: /^Admin home$/i })).toBeVisible();
    await expect(nav.getByRole('link', { name: /^Inbound pitches$/i })).toBeVisible();
    await expect(nav.getByRole('link', { name: /^MIS overview$/i })).toBeVisible();
    await expect(nav.getByRole('link', { name: /^Connection queue$/i })).toBeVisible();
    await expect(nav.getByRole('link', { name: /^Digests$/i })).toBeVisible();
    await expect(nav.getByRole('link', { name: /^Analytics$/i })).toBeVisible();

    // Must NOT be present (participant flows)
    await expect(nav.getByRole('link', { name: /^Suggestions$/i })).not.toBeVisible();
    await expect(nav.getByRole('link', { name: /^Connections$/i })).not.toBeVisible();
    await expect(nav.getByRole('link', { name: /^Pending$/i })).not.toBeVisible();
    await expect(nav.getByRole('link', { name: /^My pitch$/i })).not.toBeVisible();
    await expect(nav.getByRole('link', { name: /^MIS$/i })).not.toBeVisible();
    await expect(nav.getByRole('link', { name: /^Who viewed me$/i })).not.toBeVisible();
    await expect(nav.getByRole('link', { name: /^Documents$/i })).not.toBeVisible();
    await expect(nav.getByRole('link', { name: /^My digest$/i })).not.toBeVisible();

    // Dashboard must be the AdminDashboard variant
    await expect(page.getByTestId('admin-dashboard')).toBeVisible({ timeout: 10_000 });
  });

  // ──────────────────────────────────────────────────────────────────
  // LP
  // ──────────────────────────────────────────────────────────────────
  test('lp sees participant nav items and NOT admin items', async ({ page }) => {
    await seedAuth(page, 'lp');
    await page.goto('/dashboard');
    await page.waitForURL('**/dashboard');

    const nav = await primaryNav(page);

    // Must be present
    await expect(nav.getByRole('link', { name: /^Dashboard$/i })).toBeVisible();
    await expect(nav.getByRole('link', { name: /^Search$/i })).toBeVisible();
    await expect(nav.getByRole('link', { name: /^Suggestions$/i })).toBeVisible();
    await expect(nav.getByRole('link', { name: /^Connections$/i })).toBeVisible();
    await expect(nav.getByRole('link', { name: /^Pending$/i })).toBeVisible();
    await expect(nav.getByRole('link', { name: /^Add contact$/i })).toBeVisible();
    await expect(nav.getByRole('link', { name: /^Schedule$/i })).toBeVisible();
    await expect(nav.getByRole('link', { name: /^Documents$/i })).toBeVisible();
    await expect(nav.getByRole('link', { name: /^My digest$/i })).toBeVisible();

    // Must NOT be present (admin flows)
    await expect(nav.getByRole('link', { name: /^Admin home$/i })).not.toBeVisible();
    await expect(nav.getByRole('link', { name: /^Inbound pitches$/i })).not.toBeVisible();
    await expect(nav.getByRole('link', { name: /^MIS overview$/i })).not.toBeVisible();
    await expect(nav.getByRole('link', { name: /^Connection queue$/i })).not.toBeVisible();

    // Must NOT be present (startup-only)
    await expect(nav.getByRole('link', { name: /^My pitch$/i })).not.toBeVisible();
    await expect(nav.getByRole('link', { name: /^MIS$/i })).not.toBeVisible();

    // Dashboard must be the LP variant
    await expect(page.getByTestId('lp-dashboard')).toBeVisible({ timeout: 10_000 });
  });

  // ──────────────────────────────────────────────────────────────────
  // startup_funded
  // ──────────────────────────────────────────────────────────────────
  test('startup_funded sees pitch + MIS but NOT admin items or LP-only items', async ({ page }) => {
    await seedAuth(page, 'startup_funded');
    await page.goto('/dashboard');
    await page.waitForURL('**/dashboard');

    const nav = await primaryNav(page);

    // Must be present
    await expect(nav.getByRole('link', { name: /^Dashboard$/i })).toBeVisible();
    await expect(nav.getByRole('link', { name: /^My pitch$/i })).toBeVisible();
    await expect(nav.getByRole('link', { name: /^MIS$/i })).toBeVisible();
    await expect(nav.getByRole('link', { name: /^Connections$/i })).toBeVisible();
    await expect(nav.getByRole('link', { name: /^Suggestions$/i })).toBeVisible();
    await expect(nav.getByRole('link', { name: /^Schedule$/i })).toBeVisible();

    // Must NOT be present (admin flows)
    await expect(nav.getByRole('link', { name: /^Admin home$/i })).not.toBeVisible();
    await expect(nav.getByRole('link', { name: /^Inbound pitches$/i })).not.toBeVisible();
    await expect(nav.getByRole('link', { name: /^MIS overview$/i })).not.toBeVisible();

    // Must NOT be present (LP-only card scan)
    await expect(nav.getByRole('link', { name: /^Add contact$/i })).not.toBeVisible();

    // Dashboard must be the funded startup variant
    await expect(page.getByTestId('startup-funded-dashboard')).toBeVisible({ timeout: 10_000 });
  });

  // ──────────────────────────────────────────────────────────────────
  // partner
  // ──────────────────────────────────────────────────────────────────
  test('partner sees search + connections but NOT admin, pitch, or MIS items', async ({ page }) => {
    await seedAuth(page, 'partner');
    await page.goto('/dashboard');
    await page.waitForURL('**/dashboard');

    const nav = await primaryNav(page);

    // Must be present
    await expect(nav.getByRole('link', { name: /^Dashboard$/i })).toBeVisible();
    await expect(nav.getByRole('link', { name: /^Search$/i })).toBeVisible();
    await expect(nav.getByRole('link', { name: /^Connections$/i })).toBeVisible();
    await expect(nav.getByRole('link', { name: /^Schedule$/i })).toBeVisible();
    await expect(nav.getByRole('link', { name: /^Documents$/i })).toBeVisible();

    // Must NOT be present (admin)
    await expect(nav.getByRole('link', { name: /^Admin home$/i })).not.toBeVisible();
    await expect(nav.getByRole('link', { name: /^Inbound pitches$/i })).not.toBeVisible();

    // Must NOT be present (startup-only)
    await expect(nav.getByRole('link', { name: /^My pitch$/i })).not.toBeVisible();
    await expect(nav.getByRole('link', { name: /^MIS$/i })).not.toBeVisible();

    // Must NOT be present (LP matchmaking)
    await expect(nav.getByRole('link', { name: /^Suggestions$/i })).not.toBeVisible();

    // Must NOT be present (LP card-scan)
    await expect(nav.getByRole('link', { name: /^Add contact$/i })).not.toBeVisible();

    // Dashboard must be the partner variant
    await expect(page.getByTestId('partner-dashboard')).toBeVisible({ timeout: 10_000 });
  });
});
