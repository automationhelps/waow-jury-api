// api/artistry-feed.js
// Pulls approved artistry profiles from GHL using the Artistry application
// custom field keys. No Supabase dependency — all data comes from GHL directly.
//
// Required env vars (same as studio-stories, no new ones needed):
//   GHL_PRIVATE_TOKEN   — GHL Private Integration Token
//   GHL_LOCATION_ID     — GHL Location ID
//   AUTH_SECRET         — shared with lib/auth.js

const { requireAuth } = require('../lib/auth');

const GHL_BASE    = 'https://services.leadconnectorhq.com';
const GHL_VERSION = '2021-07-28';
const PROXY_BASE  = 'https://publish.waowconnect.org/api/image';

// GHL custom field keys — these match the merge tag names from the Artistry form
// e.g. {{contact.work_piece_1}} → fieldKey = "contact.work_piece_1"
const FIELD_KEYS = {
  website:         'contact.website_link_for_contact_me',
  headshot:        'contact.photo_of_you',
  summary:         'contact.one_sentence_about_my_art',
  biography:       'contact.bio',
  statement:       'contact.consumer_contact_information',
  membershipType:  'contact.membership_type',
  medium:          'contact.art_medium_discipline',
  work1Title:      'contact.work_piece_1_title',
  work1Image:      'contact.work_piece_1',
  work2Title:      'contact.work_piece_2_title',
  work2Image:      'contact.work_piece_2',
  work3Title:      'contact.work_piece_3_title',
  work3Image:      'contact.work_piece_3',
  work4Title:      'contact.work_piece_4_title',
  work4Image:      'contact.work_piece_4',
  work5Title:      'contact.work_piece_5_title',
  work5Image:      'contact.work_piece_5',
  work6Title:      'contact.work_piece_6_title',
  work6Image:      'contact.work_piece_6',
};

// Helper: find a custom field value by its fieldKey
function getField(customFields, key) {
  if (!Array.isArray(customFields)) return null;
  const f = customFields.find(f => f.fieldKey === key);
  if (!f) return null;
  return f.value ?? null;
}

// Helper: resolve an image value to a proxied URL
// GHL file-upload fields can return a string URL or an object with documentId
function resolveImage(val) {
  if (!val) return null;
  if (typeof val === 'string' && val.startsWith('http')) return val;
  if (typeof val === 'object') {
    // Multi-file upload: object keyed by index with { documentId, ... }
    const keys = Object.keys(val);
    if (keys.length > 0) {
      const first = val[keys[0]];
      if (first && first.documentId) return `${PROXY_BASE}/${first.documentId}`;
    }
    // Single file upload with documentId at top level
    if (val.documentId) return `${PROXY_BASE}/${val.documentId}`;
  }
  return null;
}

module.exports = async (req, res) => {
  const session = requireAuth(req);
  if (!session) {
    res.statusCode = 401;
    res.setHeader('Content-Type', 'application/json');
    return res.end(JSON.stringify({ ok: false, error: 'unauthorized' }));
  }

  const token      = process.env.GHL_PRIVATE_TOKEN;
  const locationId = process.env.GHL_LOCATION_ID;

  if (!token || !locationId) {
    res.statusCode = 500;
    res.setHeader('Content-Type', 'application/json');
    return res.end(JSON.stringify({ ok: false, error: 'missing env vars' }));
  }

  try {
    // 1) Search GHL for contacts tagged "artistry-approved"
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
          filters: [{ field: 'tags', operator: 'contains', value: 'artistry-approved' }]
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

    // 2) Fetch each contact's full record to get customFields
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

      // Build the 6 work pieces (skip any with no image)
      const works = [];
      for (let i = 1; i <= 6; i++) {
        const titleVal = getField(cf, FIELD_KEYS[`work${i}Title`]);
        const imageVal = getField(cf, FIELD_KEYS[`work${i}Image`]);
        const imageUrl = resolveImage(imageVal);
        if (imageUrl) {
          works.push({
            title: titleVal || '',
            image: imageUrl
          });
        }
      }

      artists.push({
        contactId:      contact.id,
        firstName:      contact.firstName || '',
        lastName:       contact.lastName  || '',
        email:          contact.email     || '',
        // Custom fields
        website:        getField(cf, FIELD_KEYS.website)        || contact.website || '',
        headshot:       resolveImage(getField(cf, FIELD_KEYS.headshot)),
        summary:        getField(cf, FIELD_KEYS.summary)        || '',
        biography:      getField(cf, FIELD_KEYS.biography)      || '',
        statement:      getField(cf, FIELD_KEYS.statement)      || '',
        membershipType: getField(cf, FIELD_KEYS.membershipType) || '',
        medium:         getField(cf, FIELD_KEYS.medium)         || '',
        works,          // array of { title, image }
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
