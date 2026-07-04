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
    await expect(page.locator("#contactForm")).toBeVisible();
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
    await expect(page.locator("#contactForm")).toBeVisible();
  });

  test("mobile nav LET'S TALK opens modal", async ({ page }) => {
    await page.goto("/");
    // open hamburger if visible
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

// ─── FORM VALIDATION ─────────────────────────────────────────────────────────

test.describe("Form validation", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await page.locator(".btn-lime").first().click();
    await expectModalOpen(page);
  });

  test("submit without any data shows errors", async ({ page }) => {
    await page.locator("#modalSubmitBtn").click();
    // Required fields get red border
    const firstNameBorder = await page
      .locator('[name="firstName"]')
      .evaluate((el: HTMLInputElement) => el.style.borderColor);
    expect(firstNameBorder).toBe("rgb(212, 43, 43)");
    // Services error shown
    await expect(page.locator("#servicesError")).toBeVisible();
    // Captcha error shown
    await expect(page.locator("#captchaError")).toBeVisible();
  });

  test("service pills toggle correctly", async ({ page }) => {
    const firstPill = page.locator(".modal-services-pills label").first();
    await firstPill.click();
    await expect(firstPill.locator(".pill-tag")).toHaveCSS("color", "rgb(212, 43, 43)");
    // Click again to deselect
    await firstPill.click();
    await expect(firstPill.locator(".pill-tag")).not.toHaveCSS("color", "rgb(212, 43, 43)");
  });

  test("wrong captcha shows error", async ({ page }) => {
    await page.fill('[name="firstName"]', "Test");
    await page.fill('[name="lastName"]', "User");
    await page.fill('[name="email"]', "test@example.com");
    await page.locator(".modal-services-pills label").first().click();
    await page.fill("#captchaAnswer", "99");
    await page.locator("#modalSubmitBtn").click();
    await expect(page.locator("#captchaError")).toBeVisible();
  });
});

// ─── MODAL CONTENT ────────────────────────────────────────────────────────────

test.describe("Modal content and services", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await page.locator(".btn-lime").first().click();
    await expectModalOpen(page);
  });

  test("left panel has eyebrow, heading, feature cards and trust strip", async ({ page }) => {
    await expect(page.locator(".modal-left-eyebrow")).toContainText("Future");
    await expect(page.locator(".modal-left h2")).toContainText("Today");
    await expect(page.locator(".modal-feature-card")).toHaveCount(3);
    await expect(page.locator(".modal-trust-item")).toHaveCount(3);
  });

  test("correct AI-focused service options are present", async ({ page }) => {
    const pills = page.locator(".modal-services-pills .pill-tag");
    await expect(pills).toHaveCount(5);
    await expect(pills.nth(0)).toContainText("AI Integration");
    await expect(pills.nth(1)).toContainText("Process Automation");
    await expect(pills.nth(2)).toContainText("Data Analytics");
    await expect(pills.nth(3)).toContainText("Custom AI Solutions");
    await expect(pills.nth(4)).toContainText("Not Sure");
  });

  test("captcha question is rendered", async ({ page }) => {
    const label = await page.locator("#captchaQuestion").textContent();
    expect(label).toMatch(/\d+ \+ \d+ =/);
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
    expect(parts[0]).not.toBe(parts[1]); // not equal — 45/55
  });

  test("modal stacks to single column on mobile", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/");
    // On mobile the CTA box is full-width
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
