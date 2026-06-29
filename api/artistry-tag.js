// api/artistry-tag.js
// Swaps GHL tags for a contact to move them between queue and archive.
// POST { contactId, action: "publish" | "unpublish" }
//   publish   → removes "artistry-approved", adds "artistry-published"
//   unpublish → removes "artistry-published", adds "artistry-approved"
//
// Uses the correct GHL tag endpoints:
//   POST   /contacts/{id}/tags  — add tags
//   DELETE /contacts/{id}/tags  — remove tags

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

  const headers = {
    'Authorization': `Bearer ${token}`,
    'Version': GHL_VERSION,
    'Content-Type': 'application/json',
    'Accept': 'application/json'
  };

  try {
    // 1) Remove the old tag via DELETE /contacts/{id}/tags
    const removeResp = await fetch(`${GHL_BASE}/contacts/${contactId}/tags`, {
      method: 'DELETE',
      headers,
      body: JSON.stringify({ tags: [removeTag] })
    });

    if (!removeResp.ok) {
      const text = await removeResp.text();
      res.statusCode = 502;
      return res.end(JSON.stringify({ ok: false, error: 'failed to remove tag', detail: text }));
    }

    // 2) Add the new tag via POST /contacts/{id}/tags
    const addResp = await fetch(`${GHL_BASE}/contacts/${contactId}/tags`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ tags: [addTag] })
    });

    if (!addResp.ok) {
      const text = await addResp.text();
      res.statusCode = 502;
      return res.end(JSON.stringify({ ok: false, error: 'failed to add tag', detail: text }));
    }

    const addData = await addResp.json();
    const tags    = addData.tags || [];

    res.statusCode = 200;
    return res.end(JSON.stringify({ ok: true, action, contactId, tags }));

  } catch (err) {
    res.statusCode = 500;
    return res.end(JSON.stringify({ ok: false, error: String(err && err.message || err) }));
  }
};
