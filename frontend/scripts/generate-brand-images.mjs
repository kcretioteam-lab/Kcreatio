// Renders the PWA icons and the social-share image (og-image.png) from the SVG logo.
// Run: node scripts/generate-brand-images.mjs  (needs Chrome or Edge installed; set CHROME_PATH to override)
import { readFileSync, existsSync } from 'fs';
import { fileURLToPath } from 'url';
import path from 'path';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const puppeteer = require('../../backend/node_modules/puppeteer-core');

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const pub = (p) => path.join(root, 'public', p);
const svgData = (file) => `data:image/svg+xml;base64,${readFileSync(pub(file)).toString('base64')}`;
const font = `data:font/woff2;base64,${readFileSync(pub('fonts/inter-variable.woff2')).toString('base64')}`;

const candidates = [
  process.env.CHROME_PATH,
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  '/usr/bin/google-chrome', '/usr/bin/chromium', '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
].filter(Boolean);
const executablePath = candidates.find(p => existsSync(p));
if (!executablePath) throw new Error('No Chrome/Edge found — set CHROME_PATH');

const BG = '#07080F';
const ACCENT = '#E8921A';

const icon = (size, maskable) => `<!doctype html><html><body style="margin:0;width:${size}px;height:${size}px;background:${BG};display:flex;align-items:center;justify-content:center">
  <img src="${svgData('logo/mark.svg')}" style="width:${maskable ? 60 : 78}%;height:${maskable ? 60 : 78}%;object-fit:contain">
</body></html>`;

const og = `<!doctype html><html><head><style>
  @font-face{font-family:Inter;src:url(${font}) format('woff2');font-weight:100 900}
  body{margin:0;width:1200px;height:630px;background:${BG};color:#F0F1F8;font-family:Inter,sans-serif;display:flex;flex-direction:column;justify-content:center;padding:0 88px;box-sizing:border-box;position:relative;overflow:hidden}
  .glow{position:absolute;right:-160px;top:-160px;width:620px;height:620px;border-radius:50%;background:radial-gradient(circle, rgba(232,146,26,.28), transparent 65%)}
  .brand{display:flex;align-items:center;gap:18px;margin-bottom:44px}
  .brand img{width:64px;height:64px}
  .brand span{font-size:40px;font-weight:700;letter-spacing:-.02em}
  h1{font-size:68px;line-height:1.05;font-weight:800;letter-spacing:-.03em;margin:0 0 26px;max-width:900px}
  h1 em{font-style:normal;color:${ACCENT}}
  p{font-size:30px;color:#A6ABBD;margin:0}
  .pills{display:flex;gap:14px;margin-top:40px}
  .pills div{border:1px solid #2A2E3F;border-radius:999px;padding:10px 22px;font-size:22px;color:#D5D8E3}
</style></head><body>
  <div class="glow"></div>
  <div class="brand"><img src="${svgData('logo/mark.svg')}"><span>Kcreatio</span></div>
  <h1>GST, TDS &amp; advance tax for <em>Indian creators</em></h1>
  <p>Invoices, brand deals and taxes — in one place.</p>
  <div class="pills"><div>GST invoices</div><div>TDS tracker</div><div>Advance tax planner</div></div>
</body></html>`;

const jobs = [
  { file: 'icons/icon-192.png', html: icon(192, false), w: 192, h: 192 },
  { file: 'icons/icon-512.png', html: icon(512, false), w: 512, h: 512 },
  { file: 'icons/icon-maskable-512.png', html: icon(512, true), w: 512, h: 512 },
  { file: 'icons/apple-touch-icon.png', html: icon(180, false), w: 180, h: 180 },
  { file: 'og-image.png', html: og, w: 1200, h: 630 },
];

const browser = await puppeteer.launch({ executablePath, headless: true, args: ['--no-sandbox'] });
try {
  const { mkdirSync } = await import('fs');
  mkdirSync(pub('icons'), { recursive: true });
  for (const j of jobs) {
    const page = await browser.newPage();
    await page.setViewport({ width: j.w, height: j.h, deviceScaleFactor: 1 });
    await page.setContent(j.html, { waitUntil: 'load' });
    await page.evaluate(() => document.fonts.ready);
    await page.screenshot({ path: pub(j.file), clip: { x: 0, y: 0, width: j.w, height: j.h } });
    await page.close();
    console.log('wrote', j.file);
  }
} finally {
  await browser.close();
}
