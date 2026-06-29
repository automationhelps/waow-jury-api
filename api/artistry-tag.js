// api/artistry-tag.js
// Swaps GHL tags for a contact to move them between queue and archive.
// POST { contactId, action: "publish" | "unpublish" }
//   publish   → removes "artistry-approved", adds "artistry-published"
//   unpublish → removes "artistry-published", adds "artistry-approved"

const { isAuthenticated } = require('../lib/auth');

const GHL_BASE    = 'https://services.leadconnectorhq.com';
const GHL_VERSION = '2021-07-28';

module.exports = async (req, res) => {
  res.setHeader('Content-Type', 'application/json');

  const session = isAuthenticated(req);
  if (!session) {
    res.statusCode = 401;
    return res.end(JSON.stringify({ ok: false, error: 'unauthorized' }));
  }

  if (req.method !== 'POST') {
    res.statusCode = 405;
    return res.end(JSON.stringify({ ok: false, error: 'method not allowed' }));
  }

  // Parse body
  let body = {};
  try {
    const chunks = [];
    for await (const chunk of req) chunks.push(chunk);
    body = JSON.parse(Buffer.concat(chunks).toString());
  } catch (e) {
    res.statusCode = 400;
    return res.end(JSON.stringify({ ok: false, error: 'invalid json' }));
  }

  const { contactId, action } = body;
  if (!contactId || !['publish', 'unpublish'].includes(action)) {
    res.statusCode = 400;
    return res.end(JSON.stringify({ ok: false, error: 'contactId and action (publish|unpublish) required' }));
  }

  const token = process.env.GHL_PRIVATE_TOKEN;
  if (!token) {
    res.statusCode = 500;
    return res.end(JSON.stringify({ ok: false, error: 'missing GHL_PRIVATE_TOKEN' }));
  }

  const addTag    = action === 'publish' ? 'artistry-published' : 'artistry-approved';
  const removeTag = action === 'publish' ? 'artistry-approved'  : 'artistry-published';

  try {
    // 1) Fetch current tags
    const detailResp = await fetch(`${GHL_BASE}/contacts/${contactId}`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Version': GHL_VERSION,
        'Accept': 'application/json'
      }
    });
    if (!detailResp.ok) {
      res.statusCode = 502;
      return res.end(JSON.stringify({ ok: false, error: 'failed to fetch contact' }));
    }
    const detail  = await detailResp.json();
    const contact = detail.contact || detail;
    const currentTags = Array.isArray(contact.tags) ? contact.tags : [];

    // 2) Build new tag list
    const newTags = [...new Set(
      currentTags
        .filter(t => t !== removeTag)
        .concat(addTag)
    )];

    // 3) Update contact tags
    const updateResp = await fetch(`${GHL_BASE}/contacts/${contactId}`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Version': GHL_VERSION,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify({ tags: newTags })
    });

    if (!updateResp.ok) {
      const text = await updateResp.text();
      res.statusCode = 502;
      return res.end(JSON.stringify({ ok: false, error: 'failed to update tags', detail: text }));
    }

    res.statusCode = 200;
    return res.end(JSON.stringify({ ok: true, action, contactId, tags: newTags }));

  } catch (err) {
    res.statusCode = 500;
    return res.end(JSON.stringify({ ok: false, error: String(err && err.message || err) }));
  }
};
