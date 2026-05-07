import { test, expect } from "@playwright/test";

const targetUrl =
  process.env.PLAYWRIGHT_BASE_URL && process.env.PLAYWRIGHT_BASE_URL.startsWith("http")
    ? process.env.PLAYWRIGHT_BASE_URL
    : process.env.PLAYWRIGHT_BASE_URL || "/playwright/verification";

test.describe("Verification UI (mocked)", () => {
  test("shows verified badge in mock pass scenario", async ({ page }) => {
    const response = await page.goto(targetUrl, { waitUntil: "load", timeout: 20000 });
    expect(response?.ok()).toBeTruthy();

    const badge = page.locator('[data-testid="verification-proof-trigger"]').first();
    await expect(badge).toHaveCount(1, { timeout: 15000 });
    await expect(badge).toBeVisible({ timeout: 10000 });
    await badge.click();
    await expect(badge).toBeVisible();
  });

  test("renders unverified hardware when mock fails", async ({ page }) => {
    process.env.VERIFY_USE_MOCKS = "true";
    const response = await page.goto(targetUrl, { waitUntil: "load", timeout: 20000 });
    expect(response?.ok()).toBeTruthy();

    const badge = page.locator('[data-testid="verification-proof-trigger"]').first();
    await expect(badge).toHaveCount(1, { timeout: 15000 });
    await expect(badge).toBeVisible({ timeout: 10000 });
    await badge.click();
    const unverified = page.getByText(/Unverified/);
    await expect(unverified.first()).toBeVisible();
  });
});
