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

  const authHeaders = {
    'Authorization': `Bearer ${token}`,
    'Version': GHL_VERSION,
    'Accept': 'application/json'
  };

  try {
    // 1) GET current contact to read existing tags
    const getResp = await fetch(`${GHL_BASE}/contacts/${contactId}`, {
      method: 'GET',
      headers: authHeaders
    });

    if (!getResp.ok) {
      const text = await getResp.text();
      res.statusCode = 502;
      return res.end(JSON.stringify({
        ok: false, error: 'failed to fetch contact',
        ghl_status: getResp.status, detail: text
      }));
    }

    const getData  = await getResp.json();
    const contact  = getData.contact || getData;
    const existing = Array.isArray(contact.tags) ? contact.tags : [];

    // 2) Build new tag list: remove old, add new, dedupe
    const newTags = [...new Set(
      existing.filter(t => t !== removeTag).concat(addTag)
    )];

    // 3) Try POST /contacts/{id}/tags to ADD the new tag
    const addResp = await fetch(`${GHL_BASE}/contacts/${contactId}/tags`, {
      method: 'POST',
      headers: { ...authHeaders, 'Content-Type': 'application/json' },
      body: JSON.stringify({ tags: [addTag] })
    });

    const addText = await addResp.text();

    if (!addResp.ok) {
      res.statusCode = 502;
      return res.end(JSON.stringify({
        ok: false, error: 'failed to add tag',
        ghl_status: addResp.status,
        detail: addText,
        tried_tag: addTag,
        contactId
      }));
    }

    // 4) Try DELETE /contacts/{id}/tags to REMOVE the old tag
    const delResp = await fetch(`${GHL_BASE}/contacts/${contactId}/tags`, {
      method: 'DELETE',
      headers: { ...authHeaders, 'Content-Type': 'application/json' },
      body: JSON.stringify({ tags: [removeTag] })
    });

    const delText = await delResp.text();

    if (!delResp.ok) {
      res.statusCode = 502;
      return res.end(JSON.stringify({
        ok: false, error: 'failed to remove tag',
        ghl_status: delResp.status,
        detail: delText,
        tried_tag: removeTag,
        contactId,
        note: 'add succeeded but remove failed — tag was added'
      }));
    }

    res.statusCode = 200;
    return res.end(JSON.stringify({
      ok: true, action, contactId,
      added: addTag, removed: removeTag,
      newTags
    }));

  } catch (err) {
    res.statusCode = 500;
    return res.end(JSON.stringify({ ok: false, error: String(err && err.message || err) }));
  }
};
