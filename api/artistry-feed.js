// api/artistry-feed.js
// Pulls approved artistry profiles from GHL using real custom field IDs.
// Field IDs confirmed from live GHL contact data (Vicki Pedersen, June 2026).

const { isAuthenticated } = require('../lib/auth');

const GHL_BASE    = 'https://services.leadconnectorhq.com';
const GHL_VERSION = '2021-07-28';
const PROXY_BASE  = 'https://publish.waowconnect.org/api/image';

// Real GHL custom field IDs (looked up from live contact debug output)
const FIELD_IDS = {
  membershipType: '10Nlt5l6NedE6NOSPxkT',
  medium:         'MwjoxLsrbupQoS2lv9WN',
  biography:      'drOsXj2ScM7Y9i1j14sk',   // short bio / one sentence
  statement:      'zkyBbvpSkExnbrl7DMeL',   // full bio + statement
  headshot:       'pKoOv9IPV3Sl15ovTPFM',
  contactWebsite: '2snUBhDdrBxJOT6cqswf',   // contact me link (fallback)
  // Work pieces — title + image pairs
  work1Title:     'DWwR9QIwmZNVNo1MLkgZ',
  work1Image:     '94v50B08s4Vg2NekNS08',
  work2Title:     '18cIyoM2Ptdww2P8k8mq',
  work2Image:     'lXw2wHKDS2fitljQtMGF',
  work3Title:     'A4EwYNM2mc2w38o82FjF',
  work3Image:     'g2WHlBO12w1AvUmBm5Io',
  work4Title:     'I7cAxabBL600kfZcK9eN',
  work4Image:     'ycldqQO2yZ9VFv1CzuoZ',
  work5Title:     'ZImF7Of8TzpLEAcveGWX',
  work5Image:     'qHYrurNiRjqtmCJHdzfT',
  work6Title:     'vrIQ385HY9BDFURbkAhb',
  work6Image:     '0RFNSWjTkz3tZgqwLCWb',
  work7Title:     'qWEGKO03ZJxoRCKBagTw',
  work7Image:     'kyY0fuqHSmiLlpGZQuVG',
  work8Title:     '18xAPdnzomVICRhRUrdH',
  work8Image:     'ByUlQEXapXsgU2OHNiVa',
};

// Get a field value by its ID
function getById(customFields, id) {
  if (!Array.isArray(customFields)) return null;
  const f = customFields.find(f => f.id === id);
  if (!f) return null;
  // Arrays (multi-select) — return first value or null
  if (Array.isArray(f.value)) return f.value.length > 0 ? f.value[0] : null;
  return f.value ?? null;
}

// Resolve a GHL file-upload field value to a proxied URL
function resolveImage(val) {
  if (!val) return null;
  if (typeof val === 'string' && val.startsWith('http')) return val;
  if (typeof val === 'object' && !Array.isArray(val)) {
    // Object keyed by UUID with { documentId, url, ... }
    const keys = Object.keys(val);
    if (keys.length > 0) {
      const entry = val[keys[0]];
      if (entry && entry.documentId) {
        return `${PROXY_BASE}/${entry.documentId}`;
      }
      if (entry && entry.url) return entry.url;
    }
  }
  return null;
}

// Get image URL directly from a custom field by ID
function getImageById(customFields, id) {
  if (!Array.isArray(customFields)) return null;
  const f = customFields.find(f => f.id === id);
  if (!f || !f.value) return null;
  return resolveImage(f.value);
}

// Allowed tags — only these two values are accepted to prevent abuse
const ALLOWED_TAGS = ['artistry-approved', 'artistry-published'];

module.exports = async (req, res) => {
  const session = isAuthenticated(req);
  if (!session) {
    res.statusCode = 401;
    res.setHeader('Content-Type', 'application/json');
    return res.end(JSON.stringify({ ok: false, error: 'unauthorized' }));
  }

  // Read ?tag= from query string; default to artistry-approved
  const urlObj   = new URL(req.url, 'http://localhost');
  const tagParam = urlObj.searchParams.get('tag') || 'artistry-approved';
  const tag      = ALLOWED_TAGS.includes(tagParam) ? tagParam : 'artistry-approved';

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

    const artists = [];

    // 2) Fetch full contact record for each
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

      const detail  = await detailResp.json();
      const contact = detail.contact || detail;
      const cf      = contact.customFields || [];

      // Build works array — up to 8 pieces, skip any without an image
      const works = [];
      const workDefs = [
        { titleId: FIELD_IDS.work1Title, imageId: FIELD_IDS.work1Image },
        { titleId: FIELD_IDS.work2Title, imageId: FIELD_IDS.work2Image },
        { titleId: FIELD_IDS.work3Title, imageId: FIELD_IDS.work3Image },
        { titleId: FIELD_IDS.work4Title, imageId: FIELD_IDS.work4Image },
        { titleId: FIELD_IDS.work5Title, imageId: FIELD_IDS.work5Image },
        { titleId: FIELD_IDS.work6Title, imageId: FIELD_IDS.work6Image },
        { titleId: FIELD_IDS.work7Title, imageId: FIELD_IDS.work7Image },
        { titleId: FIELD_IDS.work8Title, imageId: FIELD_IDS.work8Image },
      ];

      for (const def of workDefs) {
        const imageUrl = getImageById(cf, def.imageId);
        if (imageUrl) {
          works.push({
            title: getById(cf, def.titleId) || '',
            image: imageUrl
          });
        }
      }

      artists.push({
        contactId:      contact.id,
        firstName:      contact.firstName || '',
        lastName:       contact.lastName  || '',
        email:          contact.email     || '',
        website:        contact.website   || getById(cf, FIELD_IDS.contactWebsite) || '',
        headshot:       getImageById(cf, FIELD_IDS.headshot),
        membershipType: getById(cf, FIELD_IDS.membershipType) || '',
        medium:         getById(cf, FIELD_IDS.medium)         || '',
        biography:      getById(cf, FIELD_IDS.biography)      || '',
        statement:      getById(cf, FIELD_IDS.statement)      || '',
        works,
      });
    }

    res.statusCode = 200;
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Cache-Control', 'no-store');
    return res.end(JSON.stringify({ ok: true, count: artists.length, artists }));

  } catch (err) {
    res.statusCode = 500;
    res.setHeader('Content-Type', 'application/json');
    return res.end(JSON.stringify({ ok: false, error: String(err && err.message || err) }));
  }
};
