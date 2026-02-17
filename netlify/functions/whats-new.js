const { XMLParser } = require('fast-xml-parser');

const MAX_ITEMS = 6;
const CACHE_SECONDS = 1800; // 30 minutes
const FETCH_TIMEOUT = 8000;

const EXCLUDED_KEYWORDS = ['workshop', 'seminar', 'webinar', 'conference', 'promo code', 'betwinner', 'betting', '1xbet'];

const FALLBACK_ITEMS = [
  { title: 'Louvre Abu Dhabi — A World-Class Museum Experience', description: 'Explore masterpieces from around the world at Louvre Abu Dhabi, the first universal museum in the Arab world on Saadiyat Island.', pubDate: new Date().toISOString(), category: 'Culture' },
  { title: 'Abu Dhabi Corniche — The Ultimate Waterfront Walk', description: 'Stroll along the stunning Abu Dhabi Corniche with pristine beaches, cycling paths, and gorgeous skyline views stretching for kilometres.', pubDate: new Date().toISOString(), category: 'Outdoor' },
  { title: 'Yas Island — Theme Parks, Racing & Beaches', description: 'From Ferrari World to Yas Waterworld and Warner Bros, Yas Island packs more thrills per square kilometre than anywhere in the UAE.', pubDate: new Date().toISOString(), category: 'Attractions' },
  { title: 'Sheikh Zayed Grand Mosque — An Architectural Marvel', description: 'Visit one of the world\'s largest and most beautiful mosques, featuring 82 domes, over 1,000 columns, and the world\'s largest hand-knotted carpet.', pubDate: new Date().toISOString(), category: 'Culture' },
  { title: 'Saadiyat Island — Art, Nature & Luxury', description: 'Discover Abu Dhabi\'s cultural district with world-class museums, pristine beaches, and luxury resorts on this stunning island destination.', pubDate: new Date().toISOString(), category: 'Attractions' },
  { title: 'Mangrove National Park — Kayaking in Abu Dhabi', description: 'Paddle through Abu Dhabi\'s protected mangrove forests, home to herons, flamingos, and marine life — a peaceful escape from the city.', pubDate: new Date().toISOString(), category: 'Outdoor' }
];

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36';

function stripHtml(str) {
  if (!str) return '';
  return str
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

function truncate(str, len) {
  if (str.length <= len) return str;
  return str.substring(0, len).replace(/\s+\S*$/, '') + '...';
}

function isExcluded(title) {
  const lower = (title || '').toLowerCase();
  return EXCLUDED_KEYWORDS.some(kw => lower.includes(kw));
}

function isFutureDate(dateStr) {
  if (!dateStr) return true; // keep items without dates
  try {
    const d = new Date(dateStr);
    return d >= new Date(new Date().toDateString());
  } catch { return true; }
}

// ── Source 1: What's On UAE RSS ──
async function fetchWhatsOn() {
  const res = await fetch('https://whatson.ae/feed/', {
    headers: { 'User-Agent': UA },
    signal: AbortSignal.timeout(FETCH_TIMEOUT)
  });
  if (!res.ok) return [];

  const xml = await res.text();
  const parser = new XMLParser({ ignoreAttributes: false, isArray: (name) => name === 'item' || name === 'category' });
  const feed = parser.parse(xml);

  return (feed?.rss?.channel?.item || [])
    .filter(item => {
      const cats = Array.isArray(item.category) ? item.category : [item.category || ''];
      return cats.some(c => (c || '').toLowerCase().includes('abu dhabi'));
    })
    .filter(item => !isExcluded(item.title))
    .slice(0, 8)
    .map(item => {
      const cats = Array.isArray(item.category) ? item.category : [item.category || ''];
      const category = cats.find(c => {
        const l = (c || '').toLowerCase();
        return l && !l.includes('abu dhabi') && !l.includes('dubai');
      }) || 'Abu Dhabi';
      return {
        title: stripHtml(item.title || ''),
        description: truncate(stripHtml(item.description || ''), 150),
        pubDate: item.pubDate || new Date().toISOString(),
        category,
        source: 'whatson'
      };
    });
}

// ── Source 2: Eventbrite Abu Dhabi (JSON-LD) ──
async function fetchEventbrite() {
  const res = await fetch('https://www.eventbrite.com/d/united-arab-emirates--abu-dhabi/events/', {
    headers: { 'User-Agent': UA },
    signal: AbortSignal.timeout(FETCH_TIMEOUT)
  });
  if (!res.ok) return [];

  const html = await res.text();
  const items = [];

  // Extract JSON-LD blocks
  let idx = 0;
  while (true) {
    const start = html.indexOf('<script type="application/ld+json">', idx);
    if (start === -1) break;
    const end = html.indexOf('</script>', start);
    if (end === -1) break;
    const json = html.substring(start + 35, end);
    idx = end + 9;

    try {
      const data = JSON.parse(json);
      if (data.itemListElement) {
        for (const entry of data.itemListElement) {
          const ev = entry.item || entry;
          if (!ev.name || !isFutureDate(ev.startDate)) continue;
          if (isExcluded(ev.name)) continue;
          items.push({
            title: stripHtml(ev.name),
            description: truncate(stripHtml(ev.description || ''), 150),
            pubDate: ev.startDate || new Date().toISOString(),
            category: 'Events',
            source: 'eventbrite'
          });
        }
      }
    } catch { /* skip bad JSON */ }
  }

  return items.slice(0, 8);
}

// ── Source 3: AllEvents.in Abu Dhabi (JSON-LD) ──
async function fetchAllEvents() {
  const res = await fetch('https://allevents.in/abu-dhabi', {
    headers: { 'User-Agent': UA },
    signal: AbortSignal.timeout(FETCH_TIMEOUT)
  });
  if (!res.ok) return [];

  const html = await res.text();
  const items = [];

  let idx = 0;
  while (true) {
    const start = html.indexOf('<script type="application/ld+json">', idx);
    if (start === -1) break;
    const end = html.indexOf('</script>', start);
    if (end === -1) break;
    const json = html.substring(start + 35, end);
    idx = end + 9;

    try {
      const data = JSON.parse(json);
      if (data.itemListElement) {
        for (const entry of data.itemListElement) {
          const ev = entry.item || entry;
          if (!ev.name || !ev.startDate) continue;
          if (!isFutureDate(ev.startDate)) continue;
          if (isExcluded(ev.name)) continue;
          // Skip items with dates too far in the future (spam)
          const d = new Date(ev.startDate);
          const maxDate = new Date();
          maxDate.setFullYear(maxDate.getFullYear() + 1);
          if (d > maxDate) continue;
          items.push({
            title: stripHtml(ev.name),
            description: truncate(stripHtml(ev.description || ''), 150),
            pubDate: ev.startDate || new Date().toISOString(),
            category: 'Events',
            source: 'allevents'
          });
        }
      }
    } catch { /* skip bad JSON */ }
  }

  return items.slice(0, 8);
}

// ── Source 4: Etihad Arena (embedded JSON) ──
async function fetchEtihadArena() {
  const res = await fetch('https://www.etihadarena.ae/en/events', {
    headers: { 'User-Agent': UA },
    signal: AbortSignal.timeout(FETCH_TIMEOUT)
  });
  if (!res.ok) return [];

  const html = await res.text();
  const items = [];

  // Extract imageDetail blocks which contain event data
  const detailRe = /"imageDetail"\s*:\s*\[([\s\S]*?)\]/g;
  let match;
  while ((match = detailRe.exec(html)) !== null) {
    const block = match[1];
    if (block.length < 100) continue;

    // Extract individual event objects from the block
    // Each event has imageTitle (date) and moreLinkButton (link + label)
    const eventRe = /"imageTitle":"([^"]*)"/g;
    const linkRe = /"moreLinkButton":\{[^}]*"href":"([^"]*)","label":"([^"]*)"/g;

    const dates = [];
    const links = [];
    let em;
    while ((em = eventRe.exec(block)) !== null) dates.push(em[1]);
    while ((em = linkRe.exec(block)) !== null) links.push({ href: em[1], label: em[2] });

    for (let i = 0; i < Math.min(dates.length, links.length); i++) {
      const href = links[i].href.replace(/\\u002F/g, '/');
      const fullUrl = href.startsWith('http') ? href : 'https://www.etihadarena.ae' + href;
      const label = links[i].label;
      // Extract event name from URL slug
      const slug = href.split('/').pop();
      const name = slug.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());

      if (isExcluded(name)) continue;

      items.push({
        title: name,
        description: dates[i] + ' at Etihad Arena, Yas Island',
        pubDate: new Date().toISOString(),
        category: label === 'SOLD OUT' ? 'Sold Out' : 'Shows',
        source: 'etihad-arena'
      });
    }
  }

  return items.slice(0, 8);
}

// ── Deduplicate by title similarity ──
function deduplicate(items) {
  const seen = new Set();
  return items.filter(item => {
    const key = item.title.toLowerCase().replace(/[^a-z0-9]/g, '').substring(0, 30);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

// ── Main handler ──
exports.handler = async function () {
  try {
    const results = await Promise.allSettled([
      fetchWhatsOn(),
      fetchEventbrite(),
      fetchAllEvents(),
      fetchEtihadArena()
    ]);

    const sources = ['whatson', 'eventbrite', 'allevents', 'etihad-arena'];
    const activeSources = [];

    let allItems = [];
    results.forEach((result, i) => {
      if (result.status === 'fulfilled' && result.value.length > 0) {
        allItems = allItems.concat(result.value);
        activeSources.push(sources[i]);
      }
    });

    // Deduplicate and limit
    let items = deduplicate(allItems).slice(0, MAX_ITEMS);

    if (items.length === 0) {
      return {
        statusCode: 200,
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'public, max-age=300',
          'Access-Control-Allow-Origin': '*'
        },
        body: JSON.stringify({ items: FALLBACK_ITEMS, source: 'fallback', sources: [] })
      };
    }

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': `public, max-age=${CACHE_SECONDS}`,
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({ items, source: 'live', sources: activeSources })
    };
  } catch (err) {
    console.error('whats-new error:', err.message);
    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'public, max-age=300',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({ items: FALLBACK_ITEMS, source: 'fallback', sources: [] })
    };
  }
};
