import { expect, test } from '@playwright/test';
import { attachConsoleErrorCollector, expectNoConsoleErrors, signin } from './_helpers';

test.describe('Auth + Search smoke (Stage 5.5)', () => {
  test('LP can sign in, navigate to /search, query "fintech", see results', async ({ page }) => {
    const console = attachConsoleErrorCollector(page);

    await signin(page, 'lp');
    // Landed on /dashboard per [P-18].
    await expect(page).toHaveURL(/\/dashboard$/);

    // Sidebar "Search" link is rendered by NavList using NAV_ITEMS — visible
    // on viewports >= lg. Playwright defaults to Desktop Chrome (1280x720)
    // so the persistent sidebar is on screen.
    await page.getByRole('link', { name: /^search$/i }).click();
    await expect(page).toHaveURL(/\/search/);

    // Type the query + submit.
    await page.locator('#search-query').fill('fintech');
    await page.getByRole('button', { name: /^search$/i }).click();

    // Results grid carries data-testid="search-results"; each result card
    // carries data-testid="result-card-<user_id>".
    const resultsGrid = page.getByTestId('search-results');
    await expect(resultsGrid).toBeVisible({ timeout: 10_000 });

    const cards = resultsGrid.locator('[data-testid^="result-card-"]');
    await expect(cards.first()).toBeVisible();
    expect(await cards.count(), 'expected at least one result card').toBeGreaterThanOrEqual(1);

    await expectNoConsoleErrors(console.errors);
  });
});
