export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "https://waowconnect.org");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  const GHL_TOKEN = process.env.GHL_PRIVATE_TOKEN;
  const GHL_LOCATION_ID = process.env.GHL_LOCATION_ID;

  try {
    const response = await fetch("https://services.leadconnectorhq.com/contacts/search", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${GHL_TOKEN}`,
        Version: "2021-07-28",
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        locationId: GHL_LOCATION_ID,
        page: 1,
        pageLimit: 100,
        filters: [
          {
            field: "tags",
            operator: "contains",
            value: "ready for jury"
          }
        ]
      })
    });

    const data = await response.json();
    const contacts = Array.isArray(data.contacts) ? data.contacts : [];

    const applicants = contacts.map(contact => {
      const customFields = Array.isArray(contact.customFields) ? contact.customFields : [];

      const getCustomField = (key) => {
        const field = customFields.find(f => f.key === key);
        return field ? field.value : "";
      };

      return {
        id: contact.id || "",
        firstName: contact.firstName || "",
        lastName: contact.lastName || "",
        name: `${contact.firstName || ""} ${contact.lastName || ""}`.trim(),
        email: contact.email || "",
        medium: getCustomField("mediums") || "Medium not provided",
        experience: getCustomField("experience_level") || "Experience not provided",
        statement: getCustomField("artist_statement_notes") || "No artist statement provided.",
        gallery: getCustomField("website") || getCustomField("facebook_or_instagram_page_link") || "#",
        image: getCustomField("website") || "https://via.placeholder.com/1200x800?text=Applicant"
      };
    });

    return res.status(200).json(applicants);
  } catch (error) {
    console.error("jury-applicants error:", error);
    return res.status(500).json({ error: "Failed to fetch applicants" });
  }
}
