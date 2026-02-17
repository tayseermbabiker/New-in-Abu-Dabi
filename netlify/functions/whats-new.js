const { XMLParser } = require('fast-xml-parser');

const FEED_URL = 'https://whatson.ae/feed/';
const MAX_ITEMS = 6;
const CACHE_SECONDS = 1800; // 30 minutes

const EXCLUDED_KEYWORDS = ['workshop', 'seminar', 'webinar', 'conference'];

const FALLBACK_ITEMS = [
  {
    title: 'Louvre Abu Dhabi — A World-Class Museum Experience',
    link: 'https://whatson.ae/abu-dhabi/culture/louvre-abu-dhabi/',
    description: 'Explore masterpieces from around the world at Louvre Abu Dhabi, the first universal museum in the Arab world on Saadiyat Island.',
    pubDate: new Date().toISOString(),
    category: 'Culture'
  },
  {
    title: 'Abu Dhabi Corniche — The Ultimate Waterfront Walk',
    link: 'https://whatson.ae/abu-dhabi/outdoor/corniche/',
    description: 'Stroll along the stunning Abu Dhabi Corniche with pristine beaches, cycling paths, and gorgeous skyline views stretching for kilometres.',
    pubDate: new Date().toISOString(),
    category: 'Outdoor'
  },
  {
    title: 'Yas Island — Theme Parks, Racing & Beaches',
    link: 'https://whatson.ae/abu-dhabi/attractions/yas-island/',
    description: 'From Ferrari World to Yas Waterworld and Warner Bros, Yas Island packs more thrills per square kilometre than anywhere in the UAE.',
    pubDate: new Date().toISOString(),
    category: 'Attractions'
  },
  {
    title: 'Sheikh Zayed Grand Mosque — An Architectural Marvel',
    link: 'https://whatson.ae/abu-dhabi/culture/sheikh-zayed-grand-mosque/',
    description: 'Visit one of the world\'s largest and most beautiful mosques, featuring 82 domes, over 1,000 columns, and the world\'s largest hand-knotted carpet.',
    pubDate: new Date().toISOString(),
    category: 'Culture'
  },
  {
    title: 'Saadiyat Island — Art, Nature & Luxury',
    link: 'https://whatson.ae/abu-dhabi/attractions/saadiyat-island/',
    description: 'Discover Abu Dhabi\'s cultural district with world-class museums, pristine beaches, and luxury resorts on this stunning island destination.',
    pubDate: new Date().toISOString(),
    category: 'Attractions'
  },
  {
    title: 'Mangrove National Park — Kayaking in Abu Dhabi',
    link: 'https://whatson.ae/abu-dhabi/outdoor/mangrove-national-park/',
    description: 'Paddle through Abu Dhabi\'s protected mangrove forests, home to herons, flamingos, and marine life — a peaceful escape from the city.',
    pubDate: new Date().toISOString(),
    category: 'Outdoor'
  }
];

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

function hasExcludedKeyword(item) {
  const titleLower = (item.title || '').toLowerCase();
  const categories = Array.isArray(item.category) ? item.category : [item.category || ''];
  const categoryStr = categories.join(' ').toLowerCase();

  return EXCLUDED_KEYWORDS.some(kw => titleLower.includes(kw) || categoryStr.includes(kw));
}

function isAbuDhabiItem(item) {
  const categories = Array.isArray(item.category) ? item.category : [item.category || ''];
  return categories.some(c => (c || '').toLowerCase().includes('abu dhabi'));
}

function pickCategory(item) {
  const categories = Array.isArray(item.category) ? item.category : [item.category || ''];
  const nonCity = categories.find(c => {
    const lower = (c || '').toLowerCase();
    return lower && !lower.includes('abu dhabi') && !lower.includes('dubai') && !lower.includes('sharjah');
  });
  return nonCity || categories[0] || 'Abu Dhabi';
}

exports.handler = async function () {
  try {
    const res = await fetch(FEED_URL, {
      headers: { 'User-Agent': 'NewInAbuDhabi/1.0 (+https://newinabudhabi.com)' },
      signal: AbortSignal.timeout(8000)
    });

    if (!res.ok) {
      throw new Error(`RSS fetch failed: ${res.status}`);
    }

    const xml = await res.text();
    const parser = new XMLParser({ ignoreAttributes: false, isArray: (name) => name === 'item' || name === 'category' });
    const feed = parser.parse(xml);

    const items = (feed?.rss?.channel?.item || [])
      .filter(item => isAbuDhabiItem(item) && !hasExcludedKeyword(item))
      .slice(0, MAX_ITEMS)
      .map(item => ({
        title: stripHtml(item.title || ''),
        link: item.link || '',
        description: truncate(stripHtml(item.description || ''), 150),
        pubDate: item.pubDate || new Date().toISOString(),
        category: pickCategory(item)
      }));

    const result = items.length > 0 ? items : FALLBACK_ITEMS;

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': `public, max-age=${CACHE_SECONDS}`,
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({ items: result, source: items.length > 0 ? 'rss' : 'fallback' })
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
      body: JSON.stringify({ items: FALLBACK_ITEMS, source: 'fallback' })
    };
  }
};
