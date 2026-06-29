// api/artistry-debug.js
// TEMPORARY — dumps raw GHL custom fields for the first artistry-approved contact
// so we can verify exact fieldKey values. DELETE after debugging.

const { isAuthenticated } = require('../lib/auth');

const GHL_BASE    = 'https://services.leadconnectorhq.com';
const GHL_VERSION = '2021-07-28';

module.exports = async (req, res) => {
  const session = isAuthenticated(req);
  if (!session) {
    res.statusCode = 401;
    res.setHeader('Content-Type', 'application/json');
    return res.end(JSON.stringify({ ok: false, error: 'unauthorized' }));
  }

  const token      = process.env.GHL_PRIVATE_TOKEN;
  const locationId = process.env.GHL_LOCATION_ID;

  // Search for artistry-approved contacts
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
      pageLimit: 1,
      filters: [{
        group: 'AND',
        filters: [{ field: 'tags', operator: 'contains', value: 'artistry-approved' }]
      }]
    })
  });

  const searchData = await searchResp.json();
  const first = (searchData.contacts || [])[0];
  if (!first) {
    res.statusCode = 200;
    res.setHeader('Content-Type', 'application/json');
    return res.end(JSON.stringify({ ok: true, message: 'No artistry-approved contacts found' }));
  }

  // Fetch full contact
  const detailResp = await fetch(`${GHL_BASE}/contacts/${first.id}`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Version': GHL_VERSION,
      'Accept': 'application/json'
    }
  });

  const detail  = await detailResp.json();
  const contact = detail.contact || detail;

  res.statusCode = 200;
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Cache-Control', 'no-store');
  return res.end(JSON.stringify({
    ok: true,
    contactId:    contact.id,
    name:         `${contact.firstName} ${contact.lastName}`,
    email:        contact.email,
    website:      contact.website,
    tags:         contact.tags,
    // Raw custom fields — this is what we need to see
    customFields: contact.customFields || []
  }, null, 2));
};
