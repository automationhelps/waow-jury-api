// api/artistry-tag.js
// Swaps GHL tags for a contact to move them between queue and archive.
// POST { contactId, action: "publish" | "unpublish" }
//   publish   → removes "artistry-approved", adds "artistry-published"
//   unpublish → removes "artistry-published", adds "artistry-approved"
//
// Strategy: GET contact → compute new tag list → PUT /contacts/{id}

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
      return res.end(JSON.stringify({ ok: false, error: 'failed to fetch contact', status: getResp.status, detail: text }));
    }

    const getData  = await getResp.json();
    const contact  = getData.contact || getData;
    const existing = Array.isArray(contact.tags) ? contact.tags : [];

    // 2) Build new tag list: remove old, add new, dedupe
    const newTags = [...new Set(
      existing.filter(t => t !== removeTag).concat(addTag)
    )];

    // 3) PUT updated tags back to contact
    const putResp = await fetch(`${GHL_BASE}/contacts/${contactId}`, {
      method: 'PUT',
      headers: { ...authHeaders, 'Content-Type': 'application/json' },
      body: JSON.stringify({ tags: newTags })
    });

    if (!putResp.ok) {
      const text = await putResp.text();
      res.statusCode = 502;
      return res.end(JSON.stringify({ ok: false, error: 'failed to update contact', status: putResp.status, detail: text }));
    }

    const putData = await putResp.json();
    const finalTags = (putData.contact || putData).tags || newTags;

    res.statusCode = 200;
    return res.end(JSON.stringify({ ok: true, action, contactId, tags: finalTags }));

  } catch (err) {
    res.statusCode = 500;
    return res.end(JSON.stringify({ ok: false, error: String(err && err.message || err) }));
  }
};
