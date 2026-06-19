const router    = require('express').Router();
const auth      = require('../middleware/auth');
const RSSParser = require('rss-parser');

const parser = new RSSParser({
  timeout: 8000,
  customFields: {
    item: [
      ['media:content',   'mediaContent'],
      ['media:thumbnail', 'mediaThumbnail'],
      ['enclosure',       'enclosure'],
    ],
  },
});

const FEEDS = [
  'https://breakingmuscle.com/feed/',
  'https://www.aworkoutroutine.com/blog/feed/',
  'https://www.12minuteathlete.com/blog/feed/',
  'https://www.trxtraining.com/blogs/news.atom',
  'https://www.muscleandfitness.com/feed/'
];

let cache = null;
let cacheTime = 0;
const CACHE_TTL = 5 * 60 * 1000;

function extractImage(item) {
  if (item.mediaThumbnail?.$?.url)                                return item.mediaThumbnail.$.url;
  if (item.mediaContent?.$?.url)                                  return item.mediaContent.$.url;
  if (item.enclosure?.url && item.enclosure.type?.startsWith('image/')) return item.enclosure.url;
  return null;
}

router.use(auth);

router.get('/', async (req, res) => {
  try {
    if (cache && Date.now() - cacheTime < CACHE_TTL) {
      return res.json(cache);
    }

    const results = await Promise.allSettled(FEEDS.map(url => parser.parseURL(url)));

    const items = results
      .filter(r => r.status === 'fulfilled')
      .flatMap(r => r.value.items.map(item => ({
        title:       item.title                          ?? '',
        description: item.contentSnippet ?? item.summary ?? '',
        link:        item.link                           ?? '',
        pubDate:     item.pubDate ?? item.isoDate        ?? null,
        source:      r.value.title                       ?? '',
        image:       extractImage(item),
      })))
      .sort((a, b) => new Date(b.pubDate) - new Date(a.pubDate))
      .slice(0, 40);

    cache     = items;
    cacheTime = Date.now();
    res.json(items);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
