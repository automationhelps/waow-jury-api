const { isAuthenticated } = require("../lib/auth");

module.exports = async function handler(req, res) {
  if (!isAuthenticated(req)) return res.status(401).json({ ok: false });

  const token = process.env.GHL_PRIVATE_TOKEN || process.env.GHL_API_KEY;
  const locationId = process.env.GHL_LOCATION_ID;

  // Pull a large batch unfiltered so we can scan for the tag locally
  const r = await fetch("https://services.leadconnectorhq.com/contacts/search", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      Version: "2021-07-28",
      "Content-Type": "application/json",
      Accept: "application/json"
    },
    body: JSON.stringify({
      locationId,
      page: 1,
      pageLimit: 100
    })
  });
  const data = await r.json();
  const contacts = data.contacts || [];

  // Find contacts with the approved tag
  const approved = contacts.filter(c =>
    Array.isArray(c.tags) && c.tags.includes("studio-story-approved")
  );

  // Show first 3 in detail
  const detail = approved.slice(0, 3).map(c => ({
    id: c.id,
    firstName: c.firstName,
    lastName: c.lastName,
    email: c.email,
    tags: c.tags,
    customFields: c.customFields
  }));

  // Collect all unique tags seen
  const allTags = new Set();
  contacts.forEach(c => (c.tags || []).forEach(t => allTags.add(t)));

  res.status(200).json({
    totalReturned: contacts.length,
    grandTotal: data.total,
    approvedFound: approved.length,
    approvedDetail: detail,
    uniqueTagsInBatch: Array.from(allTags).sort()
  });
};
