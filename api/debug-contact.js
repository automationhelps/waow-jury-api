const { isAuthenticated } = require("../lib/auth");

module.exports = async function handler(req, res) {
  if (!isAuthenticated(req)) return res.status(401).json({ ok: false });

  const token = process.env.GHL_PRIVATE_TOKEN || process.env.GHL_API_KEY;
  const locationId = process.env.GHL_LOCATION_ID;

  const body = {
    locationId,
    page: 1,
    pageLimit: 25,
    filters: [
      {
        group: "AND",
        filters: [
          { field: "tags", operator: "contains", value: "studio-story-approved" }
        ]
      }
    ]
  };

  const r = await fetch("https://services.leadconnectorhq.com/contacts/search", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      Version: "2021-07-28",
      "Content-Type": "application/json",
      Accept: "application/json"
    },
    body: JSON.stringify(body)
  });

  const status = r.status;
  const data = await r.json().catch(() => ({}));
  const contacts = data.contacts || [];

  res.status(200).json({
    requestStatus: status,
    grandTotal: data.total,
    found: contacts.length,
    rawError: data.message || data.error || null,
    contacts: contacts.map(c => ({
      id: c.id,
      firstName: c.firstName,
      lastName: c.lastName,
      tags: c.tags,
      customFields: c.customFields
    }))
  });
};
