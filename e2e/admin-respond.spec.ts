import { expect, test } from '@playwright/test';
import { signin } from './_helpers';

test.describe('Target user accepts pending connection (Stage 5.5)', () => {
  test('LP target user → /connections/pending → Accept incoming → contact unlocks on /profile/:id', async ({
    page,
  }) => {
    // The MSW seed (`SEED_PENDING` in connections-handlers) includes one
    // incoming pending_target row from Priya Rao (VC, fund "NeoVC", user_id
    // 22222222-2222-4000-8000-000000000004). Any signed-in user is treated
    // as the target by the handler, so signing in as LP is sufficient to
    // exercise the target-side flow.
    await signin(page, 'lp');

    await page.goto('/connections/pending?direction=incoming');
    await expect(page.getByRole('heading', { name: /my requests/i })).toBeVisible();

    // Capture the Priya Rao row + counterpart user_id from the seed.
    const priyaRow = page
      .getByRole('article')
      .filter({ hasText: /Priya Rao/i })
      .first();
    // Falls back to a generic locator if PendingConnectionCard isn't an article.
    const candidateRow = (await priyaRow.count())
      ? priyaRow
      : page
          .locator('div')
          .filter({ hasText: /Priya Rao/i })
          .first();
    await expect(candidateRow).toBeVisible({ timeout: 10_000 });

    // 1. Accept the incoming request.
    const acceptButton = page.getByRole('button', { name: /^accept$/i }).first();
    await expect(acceptButton).toBeVisible({ timeout: 10_000 });
    await acceptButton.click();

    // 2. Confirm the mutation succeeded by polling for Priya's row to leave
    //    the pending_target listing — that's the canonical post-mutation
    //    state regardless of whether the toast is still on screen (sonner
    //    auto-dismisses after a few seconds).
    await expect
      .poll(async () => page.getByText(/Priya Rao/i).count(), { timeout: 15_000 })
      .toBe(0);

    // 3. Navigate to /connections (accepted list) via the SIDEBAR LINK so
    //    React Router does an SPA transition. CRITICAL: a hard `page.goto`
    //    here would reload the page, which re-runs `main.tsx`, which
    //    re-imports the MSW handler modules and resets module-level state
    //    (including `acceptedRows` / `pendingRows`) back to the SEED — the
    //    just-accepted Priya would vanish. The Sidebar link triggers a
    //    soft React Router navigation that preserves MSW state.
    await page.getByRole('link', { name: /^connections$/i }).click();
    await page.waitForURL('**/connections');

    // 4. Priya now appears in the accepted-connections list. Her name
    //    itself is the Link to /profile/{priya_id}. Click it (SPA nav).
    const priyaLink = page.getByRole('link', { name: /^Priya Rao$/i }).first();
    await expect(priyaLink).toBeVisible({ timeout: 10_000 });
    await priyaLink.click();
    await page.waitForURL(/\/profile\//);

    // 5. The accepted-connection contact email surfaces verbatim from the
    //    MSW accept handler (`unlocked@example.com`). `<ContactCard>` is
    //    gated on `profile.contact !== null`, which is itself gated on
    //    has_connected = true — so this single assertion implicitly
    //    confirms the unlock + the ContactCard render.
    await expect(page.getByText(/unlocked@example\.com/i).first()).toBeVisible({
      timeout: 15_000,
    });
  });
});
