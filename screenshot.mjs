import puppeteer from "file:///C:/Users/nicol/AppData/Local/Temp/puppeteer-test/node_modules/puppeteer/lib/puppeteer/puppeteer.js";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const url = process.argv[2] || "http://localhost:3000";
const label = process.argv[3] || "";

const screenshotDir = path.join(__dirname, "temporary screenshots");
if (!fs.existsSync(screenshotDir)) fs.mkdirSync(screenshotDir);

const existing = fs.readdirSync(screenshotDir).filter(f => f.endsWith(".png"));
const nextN = existing.length + 1;
const filename = label ? `screenshot-${nextN}-${label}.png` : `screenshot-${nextN}.png`;
const outPath = path.join(screenshotDir, filename);

const browser = await puppeteer.launch({
  executablePath: "C:/Users/nicol/.cache/puppeteer/chrome/win64-149.0.7827.22/chrome-win64/chrome.exe",
  args: ["--no-sandbox"],
});

const page = await browser.newPage();
await page.setViewport({ width: 1440, height: 900 });
await page.goto(url, { waitUntil: "networkidle2" });
await new Promise(r => setTimeout(r, 1800));
const scrollY = process.argv[4] ? parseInt(process.argv[4]) || 0 : 0;
if (scrollY) {
  await page.evaluate(y => window.scrollTo(0, y), scrollY);
  await new Promise(r => setTimeout(r, 800));
}
const fullPage = process.argv[5] === 'full';
await page.screenshot({ path: outPath, fullPage });

await browser.close();

console.log(`Saved: ${outPath}`);
