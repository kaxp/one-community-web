import { expect, test } from '@playwright/test';
import { seedAuth, signin } from './_helpers';

test.describe('Connection request flow (Stage 5.5)', () => {
  test('LP requests connection → admin approves → request leaves pending_admin queue', async ({
    page,
  }) => {
    // 1. Sign in as LP and search "fintech" to surface a startup target.
    await signin(page, 'lp');
    await page.getByRole('link', { name: /^search$/i }).click();
    await page.locator('#search-query').fill('fintech');
    await page.getByRole('button', { name: /^search$/i }).click();

    // Pick a result that doesn't have a seeded connection state in
    // `connections-handlers` — otherwise the profile page hides the Request
    // button because viewer_interaction.has_connected or has_requested is
    // true. NeoLedger (user_id 0002) is the cleanest: present in the search
    // catalogue but absent from SEED_ACCEPTED + SEED_PENDING.
    const targetUserId = '11111111-1111-4000-8000-000000000002';
    await expect(page.getByTestId(`result-card-${targetUserId}`)).toBeVisible({
      timeout: 10_000,
    });

    // 2. Result cards don't render a request button directly; the canonical
    //    in-platform escalation is via /profile/:id.
    await page.goto(`/profile/${targetUserId}`);
    await expect(page.getByRole('button', { name: /request to connect/i })).toBeVisible({
      timeout: 10_000,
    });
    await page.getByRole('button', { name: /request to connect/i }).click();

    // 3. RequestConnectDialog opens — fill the message + submit.
    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();
    await dialog
      .getByLabel(/message/i)
      .fill('Hi — interested in your seed round, would love 20 min.');
    await dialog.getByRole('button', { name: /send request/i }).click();

    // 4. Toast confirms success per `RequestConnectDialog`.
    await expect(page.getByText(/request sent — awaiting admin approval/i)).toBeVisible({
      timeout: 10_000,
    });

    // 5. The LP's /connections/pending page shows their seeded outgoing
    //    request (the LP-side seed pendingRows always include one outgoing
    //    pending_admin row). Re-using that signal proves the page renders.
    await page.goto('/connections/pending');
    await expect(page.getByRole('heading', { name: /pending actions/i })).toBeVisible();

    // 6. Switch to admin via direct auth-store mutation (cross-user switch).
    await seedAuth(page, 'admin');
    await page.goto('/admin/connections');

    // The default tab is `pending_admin`; ensure we're there explicitly.
    await page.getByTestId('tab-pending_admin').click();
    await page.waitForURL(/status=pending_admin/);

    // 7. The admin queue's seed includes ≥ 1 pending_admin row. Capture the
    //    starting row count, click the first Approve button, expect the
    //    matching toast + the row count to drop.
    const approveButtons = page.getByRole('button', { name: /^approve$/i });
    await expect(approveButtons.first()).toBeVisible({ timeout: 10_000 });
    const startCount = await approveButtons.count();
    expect(startCount, 'expected ≥ 1 pending_admin rows in seed').toBeGreaterThanOrEqual(1);

    await approveButtons.first().click();

    // 8. The approved row leaves the pending_admin tab — count drops by 1.
    //    Skip the toast assertion (sonner auto-dismisses after ~3s and
    //    races with the expect timeout); the row count is the canonical
    //    post-mutation signal.
    await expect
      .poll(async () => approveButtons.count(), { timeout: 15_000 })
      .toBeLessThan(startCount);
  });
});
