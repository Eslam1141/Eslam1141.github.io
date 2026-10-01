// Rasterise the Etqadem SVGs (from gen-etq-svgs.py) to the PNG icon set and favicon-etq.ico with headless Chromium,
// so the PNGs match the browser SVG rendering exactly. favicon-48-etq.png is an intermediate (ico only).
// Run: PLAYWRIGHT_CORE=<path to playwright-core> node tools/icons/render-pngs-etq.mjs
import { createRequire } from "node:module";
import { readFileSync, writeFileSync, unlinkSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_CORE || "playwright");
const ICONS = join(dirname(fileURLToPath(import.meta.url)), "..", "..", "icons");
const PAPER = "#F3F0E8";

// [source svg, output png, size, opaque background?]
const JOBS = [
  ["logo-etq.svg", "icon-192-etq.png", 192],
  ["logo-etq.svg", "icon-512-etq.png", 512],
  ["logo-etq.svg", "favicon-48-etq.png", 48],
  ["logo-etq-maskable.svg", "icon-maskable-192-etq.png", 192],
  ["logo-etq-maskable.svg", "icon-maskable-512-etq.png", 512],
  ["logo-etq-maskable.svg", "apple-touch-icon-etq.png", 180, PAPER],
  ["logo-etq.svg", "favicon-32-etq.png", 32],
  ["logo-etq-tiny.svg", "favicon-16-etq.png", 16],
  ["logo-etq-mono.svg", "icon-mono-96-etq.png", 96],
  ["logo-etq-android-fg.svg", "android/ic-launcher-foreground-etq-432.png", 432],
  ["logo-etq-android-mono.svg", "android/ic-launcher-monochrome-etq-432.png", 432],
  [null, "android/ic-launcher-background-etq-432.png", 432, PAPER],
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

// favicon-etq.ico: PNG-embedded 16 (tiny variant), 32 and 48 entries
const sizes = [[16, "favicon-16-etq.png"], [32, "favicon-32-etq.png"], [48, "favicon-48-etq.png"]];
const pngs = sizes.map(([, f]) => readFileSync(join(ICONS, f)));
const head = Buffer.alloc(6 + 16 * pngs.length);
head.writeUInt16LE(1, 2); head.writeUInt16LE(pngs.length, 4);
let off = head.length;
sizes.forEach(([n], i) => {
  const e = 6 + 16 * i;
  head[e] = n; head[e + 1] = n; head.writeUInt16LE(1, e + 4); head.writeUInt16LE(32, e + 6);
  head.writeUInt32LE(pngs[i].length, e + 8); head.writeUInt32LE(off, e + 12); off += pngs[i].length;
});
writeFileSync(join(ICONS, "favicon-etq.ico"), Buffer.concat([head, ...pngs]));
unlinkSync(join(ICONS, "favicon-48-etq.png"));
console.log("wrote favicon-etq.ico");
