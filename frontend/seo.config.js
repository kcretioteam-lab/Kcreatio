// Build-time SEO: robots.txt, sitemap.xml, and static HTML for public pages so search engines
// and link previews (WhatsApp, LinkedIn) see real text without running JavaScript.
// It is wrapped in .seo-prerender (visually hidden, see index.html) behind a boot loader, and
// React replaces the #root contents on load, so users never see this markup.
import { writeFileSync, readFileSync, mkdirSync } from 'fs';
import path from 'path';

const SITE_URL = (process.env.VITE_SITE_URL || 'https://kcreatio.com').replace(/\/$/, '');

const PAGES = [
  {
    route: '/',
    title: 'Kcreatio — GST invoices, TDS & advance tax for Indian creators',
    description: 'GST-compliant invoices, TDS tracking with Form 16A, advance tax planning and a brand-deal pipeline, built for Indian YouTubers, Instagram creators and podcasters.',
    priority: '1.0',
    body: `
      <main>
        <h1>GST, TDS and advance tax for Indian content creators</h1>
        <p>Kcreatio is the financial workspace for Indian YouTubers, Instagram creators and podcasters. Create GST invoices brands accept, track the TDS they deduct, and know your advance tax before each deadline.</p>
        <h2>GST invoices in under a minute</h2>
        <p>Rule 46 fields, CGST + SGST or IGST worked out from your GSTIN and the place of supply, SAC 998399, amount in words, and export invoices under LUT for foreign clients.</p>
        <h2>TDS and Form 16A tracking</h2>
        <p>Record the TDS each brand deducts (usually 1–10%), keep every Form 16A, and check deductions against Form 26AS / AIS before you file.</p>
        <h2>Advance tax planner</h2>
        <p>Tax year 2026-27 slabs, the Section 87A rebate, presumptive taxation and your TDS credit — with quarterly instalments and your expected refund.</p>
        <h2>Brand deal pipeline</h2>
        <p>Track deals from inquiry to payment, including barter deals paid in products, and turn a deal into an invoice in one click.</p>
        <h2>One export for your CA</h2>
        <p>Every invoice as a PDF, an Excel workbook of income, expenses and TDS, and a one-page tax summary.</p>
        <p><a href="/register">Start free</a> · <a href="/privacy">Privacy</a> · <a href="/terms">Terms</a></p>
      </main>`,
  },
  {
    route: '/privacy',
    title: 'Privacy Policy — Kcreatio',
    description: 'What Kcreatio collects, why, who it is shared with, and your rights under India’s Digital Personal Data Protection Act.',
    priority: '0.3',
    body: '<main><h1>Privacy Policy</h1><p>How Kcreatio handles your personal and financial data, your rights under the DPDP Act 2023, and how to contact our Grievance Officer.</p></main>',
  },
  {
    route: '/terms',
    title: 'Terms of Service — Kcreatio',
    description: 'The terms for using Kcreatio, the financial workspace for Indian content creators.',
    priority: '0.3',
    body: '<main><h1>Terms of Service</h1><p>The terms for using Kcreatio. Kcreatio is a software tool and does not provide tax advice.</p></main>',
  },
];

const esc = (s) => s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');

function pageHtml(template, page) {
  const url = `${SITE_URL}${page.route === '/' ? '/' : page.route}`;
  const jsonLd = page.route === '/' ? `<script type="application/ld+json">${JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: 'Kcreatio',
    applicationCategory: 'FinanceApplication',
    operatingSystem: 'Web',
    url: SITE_URL,
    description: page.description,
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'INR' },
    areaServed: 'IN',
  })}</script>` : '';
  return template
    .replace(/<title>.*?<\/title>/s, `<title>${esc(page.title)}</title>`)
    .replace(/<meta name="description"[^>]*>/, `<meta name="description" content="${esc(page.description)}" />`)
    .replace(/<meta property="og:title"[^>]*>/, `<meta property="og:title" content="${esc(page.title)}" />`)
    .replace(/<meta property="og:description"[^>]*>/, `<meta property="og:description" content="${esc(page.description)}" />`)
    .replace(/<meta name="twitter:title"[^>]*>/, `<meta name="twitter:title" content="${esc(page.title)}" />`)
    .replace(/<meta name="twitter:description"[^>]*>/, `<meta name="twitter:description" content="${esc(page.description)}" />`)
    .replace('%SITE_URL%/', `${SITE_URL}/`)
    .replaceAll('%SITE_URL%', SITE_URL)
    .replace('<link rel="canonical" href="' + SITE_URL + '/" />', `<link rel="canonical" href="${url}" />`)
    .replace('<meta property="og:url" content="' + SITE_URL + '/" />', `<meta property="og:url" content="${url}" />`)
    .replace('</head>', `${jsonLd}</head>`)
    .replace('<div id="root">', `<div id="root"><div class="seo-prerender">${page.body}</div>`);
}

export default function seoPlugin() {
  let outDir = 'dist';
  return {
    name: 'kcreatio-seo',
    apply: 'build',
    configResolved(config) { outDir = path.resolve(config.root, config.build.outDir); },
    closeBundle() {
      const template = readFileSync(path.join(outDir, 'index.html'), 'utf8');
      for (const page of PAGES) {
        const html = pageHtml(template, page);
        if (page.route === '/') {
          writeFileSync(path.join(outDir, 'index.html'), html);
        } else {
          mkdirSync(path.join(outDir, page.route), { recursive: true });
          writeFileSync(path.join(outDir, page.route, 'index.html'), html);
        }
      }
      const today = new Date().toISOString().slice(0, 10);
      writeFileSync(path.join(outDir, 'sitemap.xml'),
        `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${PAGES.map(p =>
          `  <url><loc>${SITE_URL}${p.route}</loc><lastmod>${today}</lastmod><priority>${p.priority}</priority></url>`).join('\n')}\n</urlset>\n`);
      writeFileSync(path.join(outDir, 'robots.txt'),
        `User-agent: *\nAllow: /\nDisallow: /dashboard\nDisallow: /invoices\nDisallow: /settings\nDisallow: /tds\nDisallow: /income\nDisallow: /expenses\nDisallow: /deals\nDisallow: /tax-planner\nDisallow: /api/\n\nSitemap: ${SITE_URL}/sitemap.xml\n`);
    },
  };
}
