const { isAuthenticated } = require("../lib/auth");

const FIELD_STUDIO_STORY = "nmiOEUfGyrr9CbZ9w0Hf";

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

  const data = await r.json();
  const contacts = data.contacts || [];

  const diagnosed = contacts.map(c => {
    const cfArr = c.customFields || [];
    const map = {};
    cfArr.forEach(f => { if (f && f.id) map[f.id] = f.value; });
    return {
      id: c.id,
      firstName: c.firstName,
      lastName: c.lastName,
      hasFirstName: !!c.firstName,
      lookingForFieldId: FIELD_STUDIO_STORY,
      foundStudioStoryValue: map[FIELD_STUDIO_STORY] || null,
      hasStudioStory: !!map[FIELD_STUDIO_STORY],
      allCustomFieldIds: cfArr.map(f => f.id),
      passesFilter: !!(c.firstName && map[FIELD_STUDIO_STORY])
    };
  });

  res.status(200).json({ found: contacts.length, diagnosed });
};
