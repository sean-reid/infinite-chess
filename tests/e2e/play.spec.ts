import { expect, test, type Page } from "@playwright/test";
import { NARROW_BELOW, NARROW_VIEW, WIDE_VIEW } from "../../src/views.ts";

// Pixel centre of a board square in the opening view.
async function squarePoint(page: Page, x: number, y: number) {
  const box = await page.locator("#board").boundingBox();
  if (!box) throw new Error("no board");
  const width = page.viewportSize()?.width ?? 1280;
  const v = width < NARROW_BELOW ? NARROW_VIEW : WIDE_VIEW;
  return {
    x: box.x + box.width / 2 + (x - v.cx) * v.scale,
    y: box.y + box.height / 2 - (y - v.cy) * v.scale,
  };
}

async function tapSquare(page: Page, x: number, y: number) {
  const p = await squarePoint(page, x, y);
  await page.mouse.click(p.x, p.y);
}

test("black moves the key bishop by tapping and white takes it", async ({ page }, info) => {
  await page.goto("/");
  await expect(page.locator("#status")).toHaveText(/move 1 · black to play/);
  await tapSquare(page, 46, 45);
  await expect(page.locator("#prompt")).toBeVisible();
  await expect(page.locator("#prompt label")).toContainText("up and right");
  await page.screenshot({ path: info.outputPath("selected.png") });
  await tapSquare(page, 48, 47);
  await expect(page.locator("#movelist li").first()).toContainText("b (46,45)→(48,47)");
  await expect(page.locator("#movelist li").first()).toContainText("P (49,46)×(48,47)", {
    timeout: 15_000,
  });
  await expect(page.locator("#status")).toHaveText(/move 2 · black to play/);
  await page.screenshot({ path: info.outputPath("after-capture.png") });
});

test("an open ray takes a number and white answers out there", async ({ page }) => {
  await page.goto("/");
  await tapSquare(page, 46, 45);
  const input = page.locator("#prompt input");
  await input.fill("11");
  await page.locator("#prompt button").click();
  await expect(page.locator("#movelist li").first()).toContainText("b (46,45)→(57,56)");
  await expect(page.locator("#movelist li").first()).toContainText("P (58,55)×(57,56)", {
    timeout: 15_000,
  });
});

test("undo takes back both moves and new game clears the list", async ({ page }) => {
  await page.goto("/");
  await tapSquare(page, 46, 45);
  await tapSquare(page, 48, 47);
  await expect(page.locator("#movelist li").first()).toContainText("×", { timeout: 15_000 });
  await page.getByRole("button", { name: "Undo" }).click();
  await expect(page.locator("#movelist li")).toHaveCount(0);
  await expect(page.locator("#status")).toHaveText(/move 1 · black to play/);
  await tapSquare(page, 46, 45);
  await tapSquare(page, 48, 47);
  await expect(page.locator("#movelist li")).toHaveCount(1);
  await page.getByRole("button", { name: "New game" }).click();
  await expect(page.locator("#movelist li")).toHaveCount(0);
});

test("the how-to opens and the theme toggles", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "How to play" }).click();
  await expect(page.locator("#help")).toBeVisible();
  await page.locator("#help").getByRole("button", { name: "Close" }).click();
  await expect(page.locator("#help")).toBeHidden();
  const theme = page.locator("#theme-button");
  const before = await theme.textContent();
  await theme.click();
  await expect(theme).not.toHaveText(before ?? "");
  await expect(page.locator("html")).toHaveAttribute("data-theme", /dark|light/);
});

test("the board pans with the keyboard and jumps to the throne room", async ({ page }, info) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Throne room" }).click();
  await page.focus("#board");
  await page.keyboard.press("+");
  await page.keyboard.press("ArrowLeft");
  await page.screenshot({ path: info.outputPath("throne.png") });
  await expect(page.locator("#board")).toBeVisible();
});

test("the game value and the hint follow the position", async ({ page }, info) => {
  await page.goto("/");
  await expect(page.locator("#ordinal")).toHaveText("ω4");
  await expect(page.locator("#terms")).toBeHidden();
  await page.getByRole("button", { name: "Hint" }).click();
  await expect(page.locator("#hint-text")).toContainText("key bishop");
  await expect(page.locator("#prompt")).toBeVisible();
  await tapSquare(page, 48, 47);
  await expect(page.locator("#movelist li").first()).toContainText("×", { timeout: 15_000 });
  await expect(page.locator("#ordinal")).toContainText("ω3", { timeout: 15_000 });
  await expect(page.locator("#terms")).toBeVisible();
  await expect(page.locator('[data-term="r"]')).toHaveText("1");
  await page.getByRole("button", { name: "Hint" }).click();
  await expect(page.locator("#hint-text")).toContainText("cannon");
  await page.screenshot({ path: info.outputPath("value-and-hint.png") });
});
