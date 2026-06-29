// api/artistry-tag.js
// Swaps GHL tags via GET current tags → modify → PUT back to contact.
// The dedicated POST/DELETE /contacts/{id}/tags endpoints require a
// different OAuth scope — using PUT /contacts/{id} instead which works
// with the private integration token.

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
    // 1) GET current contact tags
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

    // 2) Compute new tag list
    const newTags = [...new Set(
      existing.filter(t => t !== removeTag).concat(addTag)
    )];

    // 3) PUT full contact update with new tags
    // Note: locationId is required by GHL for PUT /contacts/{id}
    const locationId = process.env.GHL_LOCATION_ID;
    const putBody = { tags: newTags };
    if (locationId) putBody.locationId = locationId;

    const putResp = await fetch(`${GHL_BASE}/contacts/${contactId}`, {
      method: 'PUT',
      headers: { ...authHeaders, 'Content-Type': 'application/json' },
      body: JSON.stringify(putBody)
    });

    const putText = await putResp.text();

    if (!putResp.ok) {
      res.statusCode = 502;
      return res.end(JSON.stringify({
        ok: false, error: 'failed to update contact',
        ghl_status: putResp.status,
        detail: putText,
        contactId,
        tried_tags: newTags
      }));
    }

    let putData = {};
    try { putData = JSON.parse(putText); } catch(e) {}
    const finalTags = (putData.contact || putData).tags || newTags;

    res.statusCode = 200;
    return res.end(JSON.stringify({
      ok: true, action, contactId,
      added: addTag, removed: removeTag,
      tags: finalTags
    }));

  } catch (err) {
    res.statusCode = 500;
    return res.end(JSON.stringify({ ok: false, error: String(err && err.message || err) }));
  }
};
