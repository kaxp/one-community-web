import { test, expect } from '@playwright/test';

// Stage 6 S8 — unauthenticated /pitch landing page smoke.
// No auth required — no seedAuth / signin needed.

test.describe('Public pitch landing page (Stage 6 S8)', () => {
  test('loads without auth, form visible', async ({ page }) => {
    await page.goto('/pitch');
    await expect(page).toHaveURL(/\/pitch$/);
    await expect(page.getByRole('heading', { name: /pitch your startup/i })).toBeVisible();
    await expect(page.getByTestId('pitch-form')).toBeVisible();
    // Should not show the authenticated sidebar
    await expect(page.getByRole('navigation', { name: 'Primary' })).not.toBeVisible();
  });

  test('fills required fields and submits → success card visible', async ({ page }) => {
    await page.goto('/pitch');
    await page.waitForFunction(
      () => navigator.serviceWorker && navigator.serviceWorker.controller !== null,
      { timeout: 30_000 },
    );

    // Company details
    await page.getByTestId('field-company_name').fill('Greenleaf Agritech');
    await page.getByTestId('field-city').fill('Bengaluru');
    await page.getByTestId('field-sector').fill('Agritech');
    await page.getByRole('spinbutton', { name: /founded year/i }).fill('2022');
    await page.getByTestId('field-stage').selectOption('seed');
    await page.getByTestId('field-tagline').fill('Connecting farmers to buyers.');
    await page
      .getByTestId('field-description')
      .fill(
        'We connect tier-2 farmers to premium buyers via mobile-first supply chain technology, cutting middlemen and improving margins for both sides.',
      );
    await page.getByTestId('field-website_url').fill('https://greenleaf.in');
    await page.getByTestId('field-deck_url').fill('https://drive.google.com/deck-greenleaf');

    // Founder details
    await page.getByTestId('field-founder_name').fill('Priya Nair');
    await page.getByTestId('field-email').fill('priya@greenleaf.in');
    await page.getByTestId('field-phone_number').fill('9876543210');
    await page.getByTestId('field-founder_linkedin_url').fill('https://linkedin.com/in/priyanair');

    await page.getByTestId('pitch-submit').click();
    await expect(page.getByTestId('pitch-success-card')).toBeVisible({ timeout: 10_000 });
    await expect(page.getByTestId('pitch-id')).toBeVisible();
  });
});
