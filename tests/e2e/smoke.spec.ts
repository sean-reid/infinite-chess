import { expect, test } from "@playwright/test";

test("the page loads with the masthead", async ({ page }, info) => {
  await page.goto("/");
  await expect(page).toHaveTitle("infinite chess");
  await expect(page.locator(".wordmark")).toHaveText("infinite chess");
  await expect(page.locator("#ordinal")).toContainText("ω");
  await page.screenshot({ path: info.outputPath("front.png"), fullPage: true });
});

test("health answers and unknown api routes answer 404 as json", async ({ request }) => {
  const health = await request.get("/api/health");
  expect(await health.json()).toEqual({ ok: true });
  const res = await request.get("/api/nothing");
  expect(res.status()).toBe(404);
  expect(await res.json()).toEqual({ error: "not found" });
});

test("security headers are set", async ({ request }) => {
  const res = await request.get("/");
  const csp = res.headers()["content-security-policy"] ?? "";
  expect(csp).toContain("default-src 'self'");
  expect(csp).not.toContain("__");
  expect(res.headers()["x-content-type-options"]).toBe("nosniff");
});
