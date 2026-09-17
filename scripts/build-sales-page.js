#!/usr/bin/env node
// Regenerates the auto-managed regions of sales-this-week.html from sales-data.json.
// Run this every time you edit sales-data.json: `npm run build:sales`
//
// This is the seam for future automation: a scraper can write into sales-data.json
// using the same shape documented in its "_schema_help" field, then call this same
// script (or have CI call it) — the page itself never needs to change.
'use strict';
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const DATA_PATH = path.join(ROOT, 'sales-data.json');
const PAGE_PATH = path.join(ROOT, 'sales-this-week.html');
const SITEMAP_PATH = path.join(ROOT, 'sitemap.xml');
const ARCHIVE_DIR = path.join(ROOT, 'sales-archive');

function pad(n) { return String(n).padStart(2, '0'); }
function isoDate(d) { return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; }
function fmtShort(iso) {
  if (!iso) return '';
  const d = new Date(iso + 'T00:00:00');
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
}
function fmtLong(iso) {
  if (!iso) return '';
  const d = new Date(iso + 'T00:00:00');
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}
function escapeHtml(str) {
  return String(str == null ? '' : str).replace(/[&<>"']/g, c => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
  ));
}
function currentWeekRange(today) {
  const day = today.getDay(); // 0 Sun .. 6 Sat
  const diffToMon = (day === 0 ? -6 : 1 - day);
  const mon = new Date(today); mon.setDate(today.getDate() + diffToMon);
  const sun = new Date(mon); sun.setDate(mon.getDate() + 6);
  return { mon, sun };
}
function replaceBetween(html, marker, newInner) {
  const startTag = `<!--AUTO:${marker}-->`;
  const endTag = `<!--/AUTO:${marker}-->`;
  const startIdx = html.indexOf(startTag);
  const endIdx = html.indexOf(endTag);
  if (startIdx === -1 || endIdx === -1 || endIdx < startIdx) {
    throw new Error(`Marker AUTO:${marker} not found or malformed in ${PAGE_PATH}`);
  }
  return html.slice(0, startIdx + startTag.length) + '\n' + newInner + '\n        ' + html.slice(endIdx);
}

function main() {
  const raw = JSON.parse(fs.readFileSync(DATA_PATH, 'utf8'));
  const today = new Date();
  const todayIso = isoDate(today);

  const allDeals = Array.isArray(raw.deals) ? raw.deals : [];
  const active = allDeals
    .filter(d => !d.validTo || d.validTo >= todayIso)
    .slice()
    .sort((a, b) => {
      const af = a.featured ? 1 : 0, bf = b.featured ? 1 : 0;
      if (af !== bf) return bf - af; // featured first
      return (a.validTo || '9999-99-99').localeCompare(b.validTo || '9999-99-99');
    });

  const skippedExpired = allDeals.length - active.length;

  const { mon, sun } = currentWeekRange(today);
  const weekLabel = (raw.weekLabel || '').trim()
    || `${fmtShort(isoDate(mon))} – ${fmtShort(isoDate(sun))}, ${sun.getFullYear()}`;

  let html = fs.readFileSync(PAGE_PATH, 'utf8');

  // ---- <title> ----
  const titleText = active.length
    ? `This Week's Sales in Abu Dhabi (${weekLabel}) | ${active.length} Verified Deal${active.length === 1 ? '' : 's'}`
    : `This Week's Sales in Abu Dhabi | Updated Weekly Store Deals & Discounts`;
  html = html.replace(/<title>[\s\S]*?<\/title>/, `<title>${escapeHtml(titleText)}</title>`);

  // ---- meta description ----
  const topStores = active.slice(0, 3).map(d => d.store).filter(Boolean).join(', ');
  const descText = active.length
    ? `${active.length} verified store sale${active.length === 1 ? '' : 's'} in Abu Dhabi this week (${weekLabel})${topStores ? ': ' + topStores : ''} and more. Updated every week with real, hand-checked deals.`
    : `Real, hand-verified store sales and promotions in Abu Dhabi, updated every week. Check back soon for this week's deals.`;
  html = html.replace(
    /(<meta name="description" content=")[^"]*("\s*>)/,
    `$1${escapeHtml(descText)}$2`
  );

  // ---- hero (subtitle + stats) ----
  const heroInner =
`        <p class="hero-subtitle" data-en="Real store sales in Abu Dhabi, checked by hand every week — not auto-scraped. ${escapeHtml(weekLabel)}." data-ar="عروض حقيقية للمتاجر في أبوظبي، يتم التحقق منها يدويا كل أسبوع.">Real store sales in Abu Dhabi, checked by hand every week — not auto-scraped. ${escapeHtml(weekLabel)}.</p>
        <div class="hero-stats">
            <span class="hero-stat">${active.length} deal${active.length === 1 ? '' : 's'} tracked</span>
            <span class="hero-stat">Updated ${fmtLong(todayIso)}</span>
        </div>`;
  html = replaceBetween(html, 'HERO', heroInner);

  // ---- TL;DR ----
  let tldrInner;
  if (active.length === 0) {
    tldrInner = `        <div class="empty-state">This week's deals are being added — check back soon.</div>`;
  } else {
    const featured = active.filter(d => d.featured);
    const picks = (featured.length ? featured : active).slice(0, 5);
    tldrInner =
`        <ul class="tldr-list">
${picks.map(d => `            <li><strong>${escapeHtml(d.store)}</strong>${d.branch ? ' (' + escapeHtml(d.branch) + ')' : ''} — ${escapeHtml(d.offer)}, until ${fmtLong(d.validTo)}</li>`).join('\n')}
        </ul>`;
  }
  html = replaceBetween(html, 'TLDR', tldrInner);

  // ---- Full deals table ----
  let tableInner;
  if (active.length === 0) {
    tableInner = `        <div class="empty-state">No deals published yet for this week.</div>`;
  } else {
    const rows = active.map(d => {
      const verified = d.sourceUrl
        ? `<a href="${escapeHtml(d.sourceUrl)}" target="_blank" rel="noopener">Verified ${fmtShort(d.verifiedDate) || ''}</a>`
        : `Verified ${fmtShort(d.verifiedDate) || 'in-store'}`;
      return `                <tr>
                    <td><strong>${escapeHtml(d.store)}</strong>${d.branch ? `<br><span class="ds-branch">${escapeHtml(d.branch)}</span>` : ''}</td>
                    <td>${escapeHtml(d.offer)}${d.note ? `<br><span class="ds-note">${escapeHtml(d.note)}</span>` : ''}</td>
                    <td><span class="ds-badge">${escapeHtml(d.category || 'Other')}</span></td>
                    <td>${fmtLong(d.validTo) || '—'}</td>
                    <td>${escapeHtml(d.location || d.branch || '—')}</td>
                    <td>${verified}</td>
                </tr>`;
    }).join('\n');
    tableInner =
`        <div class="deals-table-wrap">
            <table class="deals-table">
                <thead>
                    <tr>
                        <th>Store</th>
                        <th>Offer</th>
                        <th>Category</th>
                        <th>Valid Until</th>
                        <th>Location</th>
                        <th>Source</th>
                    </tr>
                </thead>
                <tbody>
${rows}
                </tbody>
            </table>
        </div>`;
  }
  html = replaceBetween(html, 'DEALS_TABLE', tableInner);

  // ---- Article JSON-LD (dateModified / headline / description) ----
  const articleBlock =
`    <script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "Article",
  "headline": ${JSON.stringify(titleText)},
  "description": ${JSON.stringify(descText)},
  "mainEntityOfPage": { "@type": "WebPage", "@id": "https://newinabudhabi.com/sales-this-week" },
  "author": { "@type": "Organization", "name": "New In Abu Dhabi" },
  "publisher": { "@type": "Organization", "name": "New In Abu Dhabi", "url": "https://newinabudhabi.com/" },
  "inLanguage": "en",
  "datePublished": "2026-09-17",
  "dateModified": ${JSON.stringify(todayIso)}
}
    </script>`;
  html = replaceBetween(html, 'ARTICLE_JSONLD', articleBlock);

  fs.writeFileSync(PAGE_PATH, html, 'utf8');

  // ---- bump sitemap.xml lastmod for this page ----
  if (fs.existsSync(SITEMAP_PATH)) {
    let sitemap = fs.readFileSync(SITEMAP_PATH, 'utf8');
    const urlBlockRe = /(<loc>https:\/\/newinabudhabi\.com\/sales-this-week<\/loc>\s*<lastmod>)[^<]*(<\/lastmod>)/;
    if (urlBlockRe.test(sitemap)) {
      sitemap = sitemap.replace(urlBlockRe, `$1${todayIso}$2`);
      fs.writeFileSync(SITEMAP_PATH, sitemap, 'utf8');
    } else {
      console.warn('sitemap.xml: no <url> entry found for /sales-this-week — add one manually (see README note).');
    }
  }

  // ---- archive a dated snapshot of the data (cheap history for later) ----
  if (!fs.existsSync(ARCHIVE_DIR)) fs.mkdirSync(ARCHIVE_DIR);
  fs.writeFileSync(
    path.join(ARCHIVE_DIR, `${todayIso}.json`),
    JSON.stringify({ generatedAt: todayIso, weekLabel, deals: active }, null, 2),
    'utf8'
  );

  console.log(`Built sales-this-week.html: ${active.length} active deal(s), ${skippedExpired} expired/hidden.`);
  console.log(`Week label: ${weekLabel}`);
  console.log(`Archived snapshot: sales-archive/${todayIso}.json`);
}

main();
