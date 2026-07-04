import { test, expect, Page } from "@playwright/test";

const MODAL = "#contactModal";
const MODAL_CARD = ".modal-card";
const CLOSE_BTN = "#modalClose";

async function expectModalOpen(page: Page) {
  await expect(page.locator(MODAL)).toHaveClass(/active/, { timeout: 5000 });
  await expect(page.locator(MODAL_CARD)).toBeVisible();
}

async function expectModalClosed(page: Page) {
  await expect(page.locator(MODAL)).not.toHaveClass(/active/, { timeout: 5000 });
}

// ─── CTA BUTTON TESTS ────────────────────────────────────────────────────────

test.describe("CTA buttons open the contact modal", () => {
  test("desktop nav LET'S TALK button opens modal", async ({ page }) => {
    await page.goto("/");
    // Desktop nav button is hidden on mobile viewports — skip gracefully
    const btn = page.locator(".nav-btn").first();
    const visible = await btn.isVisible().catch(() => false);
    if (!visible) {
      test.skip();
      return;
    }
    await btn.click();
    await expectModalOpen(page);
    await expect(page.locator(".modal-left")).toBeVisible();
    await expect(page.locator(".modal-right")).toBeVisible();
    await expect(page.locator("#hsFormContainer")).toBeVisible();
  });

  test("hero Get in Touch button opens modal", async ({ page }) => {
    await page.goto("/");
    await page.locator(".btn-lime").first().click();
    await expectModalOpen(page);
    await expect(page.locator(".modal-right-title")).toContainText("Book a Free");
  });

  test("Work With Us Schedule a Consultation button opens modal", async ({ page }) => {
    await page.goto("/");
    await page.locator(".btn-work-cta").first().click();
    await expectModalOpen(page);
    await expect(page.locator("#hsFormContainer")).toBeVisible();
  });

  test("mobile nav LET'S TALK opens modal", async ({ page }) => {
    await page.goto("/");
    const hamburger = page.locator("#navHamburger");
    if (await hamburger.isVisible()) {
      await hamburger.click();
      await page.locator(".nav-mobile-cta").click();
    } else {
      // viewport is wide enough for desktop nav — skip mobile-specific flow
      test.skip();
    }
    await expectModalOpen(page);
  });
});

// ─── AUTO-OPEN TIMER TEST ─────────────────────────────────────────────────────

test.describe("Auto-open after 15–20 seconds", () => {
  test("modal opens automatically after 15s (via fake clock)", async ({ page }) => {
    // Install fake clock BEFORE navigation so setTimeout is intercepted
    await page.clock.install({ time: 0 });
    await page.goto("/");

    // Modal must NOT be open immediately
    await expect(page.locator(MODAL)).not.toHaveClass(/active/);

    // Fast-forward 20 seconds — covers the full 15–20s random range
    await page.clock.fastForward(20_000);

    await expectModalOpen(page);
  });

  test("auto-open does NOT fire if user already opened modal manually", async ({ page }) => {
    await page.clock.install({ time: 0 });
    await page.goto("/");

    // User clicks CTA before timer fires
    await page.locator(".btn-lime").first().click();
    await expectModalOpen(page);

    // Close it
    await page.locator(CLOSE_BTN).click();
    await expectModalClosed(page);

    // Fast-forward past 20s — timer should NOT re-open
    await page.clock.fastForward(25_000);

    // Modal stays closed
    await expectModalClosed(page);
  });
});

// ─── MODAL CLOSE BEHAVIOURS ───────────────────────────────────────────────────

test.describe("Modal close behaviours", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await page.locator(".btn-lime").first().click();
    await expectModalOpen(page);
  });

  test("X button closes modal", async ({ page }) => {
    await page.locator(CLOSE_BTN).click();
    await expectModalClosed(page);
  });

  test("Escape key closes modal", async ({ page }) => {
    await page.keyboard.press("Escape");
    await expectModalClosed(page);
  });

  test("clicking backdrop closes modal", async ({ page }) => {
    // Click the overlay outside the card
    await page.locator(MODAL).click({ position: { x: 10, y: 10 } });
    await expectModalClosed(page);
  });
});

// ─── HUBSPOT FORM EMBED ───────────────────────────────────────────────────────

test.describe("HubSpot form embed", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await page.locator(".btn-lime").first().click();
    await expectModalOpen(page);
  });

  test("HubSpot form container is present in the right panel", async ({ page }) => {
    await expect(page.locator("#hsFormContainer")).toBeVisible();
  });

  test("HubSpot embed script is referenced in the page", async ({ page }) => {
    const hasScript = await page.evaluate(() =>
      Array.from(document.querySelectorAll("script[src]")).some(
        (s) => (s as HTMLScriptElement).src.includes("hsforms.net")
      )
    );
    expect(hasScript).toBe(true);
  });

  test("right panel shows title, subtitle and HubSpot container", async ({ page }) => {
    await expect(page.locator(".modal-right-title")).toContainText("Book a Free");
    await expect(page.locator(".modal-right-sub")).toBeVisible();
    await expect(page.locator("#hsFormContainer")).toBeVisible();
  });
});

// ─── MODAL CONTENT ────────────────────────────────────────────────────────────

test.describe("Modal content", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await page.locator(".btn-lime").first().click();
    await expectModalOpen(page);
  });

  test("left panel has eyebrow, heading, feature cards and trust strip on desktop", async ({ page }) => {
    // Feature cards and trust strip are hidden on mobile (≤820px) — skip there
    const vw = await page.evaluate(() => window.innerWidth);
    if (vw <= 820) { test.skip(); return; }
    await expect(page.locator(".modal-left-eyebrow")).toContainText("Future");
    await expect(page.locator(".modal-left h2")).toContainText("Today");
    await expect(page.locator(".modal-feature-card")).toHaveCount(3);
    await expect(page.locator(".modal-trust-item")).toHaveCount(3);
  });

  test("left panel shows compact eyebrow and heading on mobile", async ({ page }) => {
    const vw = await page.evaluate(() => window.innerWidth);
    if (vw > 820) { test.skip(); return; }
    await expect(page.locator(".modal-left-eyebrow")).toBeVisible();
    await expect(page.locator(".modal-left h2")).toBeVisible();
    // Feature cards hidden on mobile
    await expect(page.locator(".modal-feature-cards")).toBeHidden();
  });

  test("right panel has HubSpot container and correct heading", async ({ page }) => {
    await expect(page.locator(".modal-right-title")).toContainText("Book a Free");
    await expect(page.locator("#hsFormContainer")).toBeVisible();
  });
});

// ─── RESPONSIVE / LAYOUT ─────────────────────────────────────────────────────

test.describe("Responsive layout", () => {
  test("modal has two columns on desktop", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto("/");
    await page.locator(".btn-lime").first().click();
    await expectModalOpen(page);

    const cols = await page.locator(MODAL_CARD).evaluate(
      (el) => getComputedStyle(el).gridTemplateColumns
    );
    // Should have two distinct column values (45/55 split)
    const parts = cols.trim().split(/\s+/);
    expect(parts).toHaveLength(2);
    expect(parts[0]).not.toBe(parts[1]);
  });

  test("modal stacks to single column on mobile", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/");
    await page.locator(".btn-lime").first().click();
    await expectModalOpen(page);

    const cols = await page.locator(MODAL_CARD).evaluate(
      (el) => getComputedStyle(el).gridTemplateColumns
    );
    // Single column: only one value
    const parts = cols.trim().split(/\s+/);
    expect(parts).toHaveLength(1);
  });

  test("modal does not exceed viewport height on desktop", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto("/");
    await page.locator(".btn-lime").first().click();
    await expectModalOpen(page);

    const { cardH, vpH } = await page.evaluate(() => ({
      cardH: document.querySelector(".modal-card")!.getBoundingClientRect().height,
      vpH:   window.innerHeight,
    }));
    expect(cardH).toBeLessThanOrEqual(vpH);
  });

  test("modal does not exceed viewport height on mobile", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/");
    await page.locator(".btn-lime").first().click();
    await expectModalOpen(page);

    const { cardH, vpH } = await page.evaluate(() => ({
      cardH: document.querySelector(".modal-card")!.getBoundingClientRect().height,
      vpH:   window.innerHeight,
    }));
    expect(cardH).toBeLessThanOrEqual(vpH + 2); // +2px tolerance
  });
});
