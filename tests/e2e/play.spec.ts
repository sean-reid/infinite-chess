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
  const before = await theme.getAttribute("aria-pressed");
  await theme.click();
  await expect(theme).toHaveText("Dark theme");
  await expect(theme).toHaveAttribute("aria-pressed", before === "true" ? "false" : "true");
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

test("a game survives a reload and a link restores it", async ({ page, context }) => {
  await page.goto("/");
  await tapSquare(page, 46, 45);
  await tapSquare(page, 48, 47);
  await expect(page.locator("#movelist li").first()).toContainText("×", { timeout: 15_000 });
  await expect(page).toHaveURL(/#g=[A-Za-z0-9_-]{4,40}$/);
  await page.reload();
  await expect(page.locator("#movelist li")).toHaveCount(1);
  await expect(page.locator("#status")).toHaveText(/move 2 · black to play/);
  await page.goto("/");
  await expect(page.locator("#movelist li")).toHaveCount(1);
  await page.getByRole("button", { name: "Undo" }).click();
  await expect(page.locator("#movelist li")).toHaveCount(0);
  const fresh = await context.newPage();
  await fresh.goto("/#g=46.45-57.56;58.55-57.56");
  await expect(fresh.locator("#movelist li").first()).toContainText("P (58,55)×(57,56)");
  fresh.once("dialog", (d) => d.accept());
  await fresh.getByRole("button", { name: "Resign" }).click();
  await expect(fresh.locator("#stats")).toContainText("1 finished");
});

test("selecting a piece never moves the view", async ({ page }) => {
  await page.goto("/");
  await tapSquare(page, 46, 45);
  await tapSquare(page, 48, 47);
  await expect(page.locator("#movelist li").first()).toContainText("×", { timeout: 15_000 });
  await page.getByRole("button", { name: "Throne room" }).click();
  await page.focus("#board");
  for (let i = 0; i < 4; i++) await page.keyboard.press("+");
  await expect(page.locator("#board")).toHaveAttribute("data-cx", "32");
  await expect(page.locator("#board")).toHaveAttribute("data-cy", "61");
  const box = await page.locator("#board").boundingBox();
  if (!box) throw new Error("no board");
  await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2 + 64);
  await page.mouse.click(box.x + box.width / 2 - 48, box.y + box.height / 2 - 48);
  await expect(page.locator("#board")).toHaveAttribute("data-cx", "32");
  await expect(page.locator("#board")).toHaveAttribute("data-cy", "61");
});

const MATE_LINK =
  "RYxBCgIxEAS7OzEIMUISwdOCgqse_IA-QC--YNmT_3-ETLLiabqma2aevP_M1HqoFYCAXIa9CHgPkCeM4y1B5yvY-980h7occ7mvLMdN2v7v3jHGx4GyDMh80aEx4V3jYJ2hmkNg8dt_y8pPyEkqLxKOyz6l7tVd5xC-";

test("a finished game reads 0 and offers nothing to press but a new game", async ({
  page,
}, info) => {
  await page.goto(`/#g=${MATE_LINK}`);
  await expect(page.locator("#status")).toContainText("Checkmate. White wins after 25 moves.");
  await expect(page.locator("#ordinal")).toHaveText("0");
  await page.screenshot({ path: info.outputPath("mate.png") });
  await expect(page.getByRole("button", { name: "Hint" })).toBeDisabled();
  await expect(page.getByRole("button", { name: "Resign" })).toBeDisabled();
  await expect(page.getByRole("button", { name: "Undo" })).toBeEnabled();
});

test("controls that would do nothing are disabled, and resign asks first", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("button", { name: "Undo" })).toBeDisabled();
  await expect(page.getByRole("button", { name: "Resign" })).toBeDisabled();
  await expect(page.getByRole("button", { name: "Hint" })).toBeEnabled();
  await tapSquare(page, 46, 45);
  await tapSquare(page, 48, 47);
  await expect(page.locator("#movelist li").first()).toContainText("×", { timeout: 15_000 });
  page.once("dialog", (d) => d.dismiss());
  await page.getByRole("button", { name: "Resign" }).click();
  await expect(page.locator("#status")).toHaveText(/black to play/);
  page.once("dialog", (d) => d.accept());
  await page.getByRole("button", { name: "Resign" }).click();
  await expect(page.locator("#status")).toContainText("Black resigned after 1 moves.");
});

test("a shared link plays without replacing the saved game, and the hash is live", async ({
  page,
}) => {
  await page.goto("/");
  await tapSquare(page, 46, 45);
  await tapSquare(page, 48, 47);
  await expect(page.locator("#movelist li").first()).toContainText("×", { timeout: 15_000 });
  const saved = await page.evaluate(() => localStorage.getItem("infinite-chess:game"));
  await page.goto(`/#g=${MATE_LINK}`);
  await expect(page.locator("#status")).toContainText("Checkmate");
  expect(await page.evaluate(() => localStorage.getItem("infinite-chess:game"))).toBe(saved);
  await page.evaluate(() => {
    location.hash = "#g=46.45-57.56;58.55-57.56";
  });
  await expect(page.locator("#movelist li").first()).toContainText("P (58,55)×(57,56)");
  await page.goto("/");
  await expect(page.locator("#movelist li").first()).toContainText("P (49,46)×(48,47)");
});
