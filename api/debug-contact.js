const { isAuthenticated } = require("../lib/auth");

module.exports = async function handler(req, res) {
  if (!isAuthenticated(req)) return res.status(401).json({ ok: false });

  const token = process.env.GHL_PRIVATE_TOKEN || process.env.GHL_API_KEY;
  const locationId = process.env.GHL_LOCATION_ID;

  const r = await fetch(
    `https://services.leadconnectorhq.com/locations/${locationId}/customFields`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
        Version: "2021-07-28",
        Accept: "application/json"
      }
    }
  );

  const data = await r.json();
  const fields = (data.customFields || []).map(f => ({
    id: f.id,
    name: f.name,
    fieldKey: f.fieldKey,
    dataType: f.dataType
  }));

  // Filter to just the ones we care about
  const matches = fields.filter(f =>
    /studio[_ ]?stor/i.test(f.name || "") || /studio[_ ]?stor/i.test(f.fieldKey || "")
  );

  res.status(200).json({
    totalFields: fields.length,
    studioStoryMatches: matches,
    allFields: fields
  });
};
