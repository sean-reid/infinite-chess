// Plays the demo line against the app and saves one still per moment into
// figures/demo. Run from the repo root: node talk/demo/shots.mjs [base url]
import { chromium } from "@playwright/test";
import { mkdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const base = process.argv[2] ?? "https://infinite-chess.dwainosaur.com";
const out = join(here, "..", "figures", "demo");
const link = readFileSync(join(here, "rook-attacked.url"), "utf8").trim();
mkdirSync(out, { recursive: true });

const browser = await chromium.launch();
const page = await browser.newPage({
  viewport: { width: 1280, height: 720 },
  deviceScaleFactor: 2,
  colorScheme: "light",
});
// The masthead and footer are cropped away; what remains is the board and the panel.
const clip = { x: 0, y: 104, width: 1280, height: 540 };
const still = async (name) => {
  await page.waitForTimeout(400);
  await page.screenshot({ path: join(out, `${name}.png`), clip });
  const value = (await page.locator("#ordinal").innerText()).replace(/\s+/g, " ");
  console.log(`${name}: ${value} | ${await page.locator("#status").innerText()}`);
};
const blackToPlay = () =>
  page.locator("#status").filter({ hasText: "black to play" }).waitFor({ timeout: 30_000 });
const hint = async () => {
  await page.getByRole("button", { name: "Hint" }).click();
  await page.locator("#hint-text").waitFor();
  await page.waitForTimeout(300);
};
const landing = async (label) => {
  await page.locator("#prompt .landings button", { hasText: label }).click();
  await blackToPlay();
};
const moveTo = async () => {
  await page.locator("#prompt .hint-move").click();
  await blackToPlay();
};

await page.goto(`${base}/`, { waitUntil: "networkidle" });
await page.evaluate(() => localStorage.clear());
await page.goto(`${base}/`, { waitUntil: "networkidle" });
await page.waitForTimeout(500);
await hint();
await landing("2 towers");
await still("1-key-bishop");
await hint();
await landing("wing 1");
await still("2-cannon-open");
await hint();
await moveTo();
await still("3-gate-answered");
await hint();
await moveTo();
await hint();
await landing("wing 2");
await still("4-shot");

await page.goto(link, { waitUntil: "networkidle" });
await page.waitForTimeout(3000);
await hint();
await page.locator("#prompt input").fill("5");
await page.getByRole("button", { name: "Move", exact: true }).click();
await blackToPlay();
await still("5-rook");
await browser.close();
