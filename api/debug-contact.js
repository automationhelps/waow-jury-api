const { isAuthenticated } = require("../lib/auth");

module.exports = async function handler(req, res) {
  if (!isAuthenticated(req)) return res.status(401).json({ ok: false });

  const token = process.env.GHL_PRIVATE_TOKEN || process.env.GHL_API_KEY;
  const locationId = process.env.GHL_LOCATION_ID;

  const r = await fetch("https://services.leadconnectorhq.com/contacts/search", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      Version: "2021-07-28",
      "Content-Type": "application/json",
      Accept: "application/json"
    },
    body: JSON.stringify({ locationId, page: 1, pageLimit: 5 })
  });

  const data = await r.json();
  const sample = (data.contacts || []).map(c => ({
    id: c.id,
    name: `${c.firstName || ""} ${c.lastName || ""}`.trim(),
    tags: c.tags,
    customFields: c.customFields
  }));

  res.status(200).json({ total: data.total, sample });
};
