const { isAuthenticated } = require("../lib/auth");

module.exports = async function handler(req, res) {
  if (!isAuthenticated(req)) return res.status(401).json({ ok: false });

  const token = process.env.GHL_PRIVATE_TOKEN || process.env.GHL_API_KEY;
  const locationId = process.env.GHL_LOCATION_ID;

  // Search for the test contact by email
  const search = await fetch("https://services.leadconnectorhq.com/contacts/search", {
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
      pageLimit: 25,
      filters: [
        {
          group: "AND",
          filters: [
            { field: "tags", operator: "contains", value: "studio-story-approved" }
          ]
        }
      ]
    })
  });
  const searchData = await search.json();
  const target = (searchData.contacts || []).find(c => c.firstName === "JB" || c.lastName === "Tester");

  if (!target) {
    return res.status(200).json({ error: "JB Tester not found in approved list" });
  }

  // Now fetch the FULL contact record by ID — this often returns more fields
  const full = await fetch(`https://services.leadconnectorhq.com/contacts/${target.id}`, {
    headers: {
      Authorization: `Bearer ${token}`,
      Version: "2021-07-28",
      Accept: "application/json"
    }
  });
  const fullData = await full.json();

  res.status(200).json({
    fromSearch: target,
    fromGetById: fullData
  });
};
