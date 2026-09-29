// Rasterise the Dial Vane SVGs (from gen-svgs.py) to the PNG icon set with headless Chromium,
// so the PNGs match the browser's SVG rendering exactly.
// Run: PLAYWRIGHT_CORE=<path to playwright-core> node tools/icons/render-pngs.mjs
import { createRequire } from "node:module";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_CORE || "playwright");
const ICONS = join(dirname(fileURLToPath(import.meta.url)), "..", "..", "icons");
const PAPER = "#F3F0E8";

// [source svg, output png, size, opaque background?]
const JOBS = [
  ["logo-dv.svg", "icon-192-dv.png", 192],
  ["logo-dv.svg", "icon-512-dv.png", 512],
  ["logo-dv.svg", "favicon-48-dv.png", 48],
  ["logo-dv-maskable.svg", "icon-maskable-192-dv.png", 192],
  ["logo-dv-maskable.svg", "icon-maskable-512-dv.png", 512],
  ["logo-dv-maskable.svg", "apple-touch-icon-dv.png", 180, PAPER],
  ["logo-dv-tiny.svg", "favicon-32-dv.png", 32],
  ["logo-dv-tiny.svg", "favicon-16-dv.png", 16],
  ["logo-dv-mono.svg", "icon-mono-96-dv.png", 96],
  ["logo-dv-android-fg.svg", "android/ic-launcher-foreground-432.png", 432],
  ["logo-dv-android-mono.svg", "android/ic-launcher-monochrome-432.png", 432],
  [null, "android/ic-launcher-background-432.png", 432, PAPER],
];

const browser = await chromium.launch();
const page = await browser.newPage();
for (const [src, out, size, bg] of JOBS) {
  const svg = src ? readFileSync(join(ICONS, src), "utf8").replace("<svg ", `<svg width="${size}" height="${size}" `) : "";
  await page.setViewportSize({ width: size, height: size });
  await page.setContent(
    `<html><body style="margin:0;background:${bg || "transparent"}">${svg}</body></html>`);
  await page.screenshot({ path: join(ICONS, out), omitBackground: !bg, clip: { x: 0, y: 0, width: size, height: size } });
  console.log("wrote", out);
}
await browser.close();
