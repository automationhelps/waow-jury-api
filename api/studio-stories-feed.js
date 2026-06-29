// api/studio-stories-feed.js
// Supports ?tag= query param so the publisher can fetch Queue and Archive separately.
// Defaults to studio-story-approved if no tag is passed.

const { isAuthenticated } = require('../lib/auth');

const GHL_BASE = 'https://services.leadconnectorhq.com';
const GHL_VERSION = '2021-07-28';

const FIELD_STUDIO_STORY  = 'nmiOEUfGyrr9CbZ9w0Hf';
const FIELD_STUDIO_IMAGES = '3zsyvPdjpZtnlesnwwhX';

const PROXY_BASE = 'https://publish.waowconnect.org/api/image';

const ALLOWED_TAGS = ['studio-story-approved', 'studio-story-published'];

module.exports = async (req, res) => {
  if (!isAuthenticated(req)) {
    res.statusCode = 401;
    res.setHeader('Content-Type', 'application/json');
    return res.end(JSON.stringify({ ok: false, error: 'unauthorized' }));
  }

  // Read ?tag= from query string; default to studio-story-approved
  const urlObj   = new URL(req.url, 'http://localhost');
  const tagParam = urlObj.searchParams.get('tag') || 'studio-story-approved';
  const tag      = ALLOWED_TAGS.includes(tagParam) ? tagParam : 'studio-story-approved';

  const token      = process.env.GHL_PRIVATE_TOKEN;
  const locationId = process.env.GHL_LOCATION_ID;

  if (!token || !locationId) {
    res.statusCode = 500;
    res.setHeader('Content-Type', 'application/json');
    return res.end(JSON.stringify({ ok: false, error: 'missing env vars' }));
  }

  try {
    // 1) Search for contacts with the requested tag
    const searchResp = await fetch(`${GHL_BASE}/contacts/search`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Version': GHL_VERSION,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify({
        locationId,
        pageLimit: 100,
        filters: [{
          group: 'AND',
          filters: [{ field: 'tags', operator: 'contains', value: tag }]
        }]
      })
    });

    if (!searchResp.ok) {
      const text = await searchResp.text();
      res.statusCode = 502;
      res.setHeader('Content-Type', 'application/json');
      return res.end(JSON.stringify({ ok: false, error: 'ghl search failed', detail: text }));
    }

    const searchData = await searchResp.json();
    const slim = Array.isArray(searchData.contacts) ? searchData.contacts : [];

    // 2) Fetch each contact in full to get customFields
    const stories = [];

    for (const c of slim) {
      const detailResp = await fetch(`${GHL_BASE}/contacts/${c.id}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Version': GHL_VERSION,
          'Accept': 'application/json'
        }
      });

      if (!detailResp.ok) continue;

      const detail       = await detailResp.json();
      const contact      = detail.contact || detail;
      const customFields = Array.isArray(contact.customFields) ? contact.customFields : [];

      const storyField  = customFields.find(f => f.id === FIELD_STUDIO_STORY);
      const imagesField = customFields.find(f => f.id === FIELD_STUDIO_IMAGES);

      const studioStory = storyField && typeof storyField.value === 'string'
        ? storyField.value : '';

      const images = [];
      if (imagesField && imagesField.value && typeof imagesField.value === 'object') {
        for (const key of Object.keys(imagesField.value)) {
          const entry = imagesField.value[key];
          if (entry && entry.documentId) {
            images.push(`${PROXY_BASE}/${entry.documentId}`);
          }
        }
      }

      stories.push({
        contactId:  contact.id,
        firstName:  contact.firstName || '',
        lastName:   contact.lastName  || '',
        email:      contact.email     || '',
        phone:      contact.phone     || '',
        website:    contact.website   || '',
        studioStory,
        image:  images[0] || null,
        images
      });
    }

    res.statusCode = 200;
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Cache-Control', 'no-store');
    return res.end(JSON.stringify({ ok: true, count: stories.length, stories }));

  } catch (err) {
    res.statusCode = 500;
    res.setHeader('Content-Type', 'application/json');
    return res.end(JSON.stringify({ ok: false, error: String(err && err.message || err) }));
  }
};
