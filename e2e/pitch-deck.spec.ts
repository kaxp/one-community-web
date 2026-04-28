import { expect, test } from '@playwright/test';
import { signin } from './_helpers';

test.describe('Pitch deck flow (Stage 5.5)', () => {
  test.setTimeout(60_000); // Deck job polls take 2 × 3s by default.

  test('startup_funded user submits profile → submits deck → AI evaluation renders', async ({
    page,
  }) => {
    await signin(page, 'startup_funded');

    // Pitch is gated to startup roles + admin per [router.tsx:208-216]; the
    // sidebar exposes "My pitch" for startup_funded.
    await page.getByRole('link', { name: /^my pitch$/i }).click();
    await expect(page).toHaveURL(/\/pitch/);

    // Default scenario seeds a present profile, so we land on Edit mode.
    await expect(page.getByText(/edit startup profile/i)).toBeVisible({ timeout: 10_000 });

    // Fill the financial-metrics fields (they aren't in the seed pitch
    // profile fixture). Without values, RHF's `valueAsNumber: true` produces
    // NaN and the strict Zod schema rejects with "Expected number, received
    // nan". The unit test PitchPage.test.tsx covers this prefilled-form
    // path; the e2e just needs valid input here.
    await page.getByLabel(/monthly revenue/i).fill('2500000');
    await page.getByLabel(/monthly burn/i).fill('1500000');
    await page.getByLabel(/runway \(months\)/i).fill('18');

    // Save — exercises POST /pitch/profile.
    await page.getByRole('button', { name: /save changes/i }).click();
    await expect(page.getByText(/^profile saved$/i).first()).toBeVisible({ timeout: 10_000 });

    // Switch to the Deck tab.
    await page.getByTestId('pitch-tab-deck').click();
    await page.waitForURL(/tab=deck/);
    await expect(page.getByText(/submit pitch deck/i)).toBeVisible();

    // Submit a Drive URL — the MSW handler returns a 202 + job_id and the
    // poll flips to SUCCESS after `pollsBeforeSuccess` reads (default 2).
    await page.getByLabel(/deck url/i).fill('https://drive.google.com/file/d/abc-stage55/view');
    await page.getByRole('button', { name: /^submit deck$/i }).click();

    // Polling indicator surfaces while the job runs.
    await expect(page.getByTestId('execution-panel-polling')).toBeVisible({ timeout: 10_000 });

    // Final AI evaluation renders inside the panel — the seeded fixture has
    // signal='strong'.
    await expect(page.getByTestId('ai-signal-strong')).toBeVisible({ timeout: 30_000 });
  });
});
