export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "https://waowconnect.org");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  const GHL_TOKEN = process.env.GHL_PRIVATE_TOKEN;
  const GHL_LOCATION_ID = process.env.GHL_LOCATION_ID;
  const API_BASE = "https://services.leadconnectorhq.com";

  const ghlHeaders = {
    Authorization: `Bearer ${GHL_TOKEN}`,
    Version: "2021-07-28",
    "Content-Type": "application/json"
  };

  const normalize = (value) =>
    String(value || "")
      .trim()
      .toLowerCase()
      .replace(/\{\{|\}\}/g, "")
      .replace(/^contact\./, "")
      .replace(/[^a-z0-9]+/g, "_")
      .replace(/^_+|_+$/g, "");

  const firstNonEmpty = (...values) => {
    for (const value of values) {
      if (value !== undefined && value !== null && String(value).trim() !== "") {
        return value;
      }
    }
    return "";
  };

  const getCustomFieldValue = (contact, possibleNames = []) => {
    const wanted = possibleNames.map(normalize);

    // direct properties first
    for (const name of possibleNames) {
      if (contact[name] !== undefined && contact[name] !== null && String(contact[name]).trim() !== "") {
        return contact[name];
      }
    }

    // common custom field containers
    const candidateCollections = [
      contact.customFields,
      contact.customField,
      contact.custom_fields
    ];

    for (const collection of candidateCollections) {
      if (Array.isArray(collection)) {
        for (const field of collection) {
          const candidates = [
            field.key,
            field.name,
            field.fieldKey,
            field.id,
            field.label,
            field.placeholder
          ].map(normalize);

          const matched = candidates.some((candidate) => wanted.includes(candidate));
          if (matched && field.value !== undefined && field.value !== null && String(field.value).trim() !== "") {
            return field.value;
          }
        }
      }

      if (collection && typeof collection === "object" && !Array.isArray(collection)) {
        for (const [key, value] of Object.entries(collection)) {
          if (wanted.includes(normalize(key)) && value !== undefined && value !== null && String(value).trim() !== "") {
            return value;
          }
        }
      }
    }

    return "";
  };

  try {
    // 1) Search for contacts tagged ready for jury
    const searchResponse = await fetch(`${API_BASE}/contacts/search`, {
      method: "POST",
      headers: ghlHeaders,
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

    if (!searchResponse.ok) {
      const errorText = await searchResponse.text();
      throw new Error(`Search Contacts failed: ${searchResponse.status} ${errorText}`);
    }

    const searchData = await searchResponse.json();
    const searchContacts = Array.isArray(searchData.contacts) ? searchData.contacts : [];

    // 2) Fetch each contact's full record by ID
    const detailedContacts = await Promise.all(
      searchContacts.map(async (contact) => {
        try {
          const detailResponse = await fetch(`${API_BASE}/contacts/${contact.id}`, {
            method: "GET",
            headers: {
              Authorization: `Bearer ${GHL_TOKEN}`,
              Version: "2021-07-28"
            }
          });

          if (!detailResponse.ok) {
            // fallback to the search result if detail fetch fails
            return contact;
          }

          const detailData = await detailResponse.json();

          // Handle common response shapes
          return (
            detailData.contact ||
            detailData.data?.contact ||
            detailData.data ||
            detailData
          );
        } catch (err) {
          console.error(`Failed to fetch contact ${contact.id}:`, err);
          return contact;
        }
      })
    );

    // 3) Build applicant cards from detailed contacts
    const applicants = detailedContacts.map((contact) => {
      const firstName = firstNonEmpty(contact.firstName, contact.first_name);
      const lastName = firstNonEmpty(contact.lastName, contact.last_name);
      const fullName = firstNonEmpty(
        contact.name,
        `${firstName} ${lastName}`.trim()
      );

      const medium = firstNonEmpty(
        getCustomFieldValue(contact, [
          "mediums",
          "medium",
          "contact.mediums",
          "contact.medium",
          "Mediums",
          "Medium"
        ]),
        "Medium not provided"
      );

      const experience = firstNonEmpty(
        getCustomFieldValue(contact, [
          "experience_level",
          "experience",
          "contact.experience_level",
          "contact.experience",
          "Experience Level",
          "Experience"
        ]),
        "Experience not provided"
      );

      const statement = firstNonEmpty(
        getCustomFieldValue(contact, [
          "artist_statement_notes",
          "artist_statement",
          "contact.artist_statement_notes",
          "contact.artist_statement",
          "Artist Statement / Notes",
          "Artist Statement"
        ]),
        "No artist statement provided."
      );

      const website = firstNonEmpty(
        getCustomFieldValue(contact, [
          "website",
          "contact.website",
          "Website"
        ])
      );

      const socialLink = firstNonEmpty(
        getCustomFieldValue(contact, [
          "facebook_or_instagram_page_link",
          "instagram",
          "facebook",
          "contact.facebook_or_instagram_page_link",
          "Facebook Or Instagram Page Link"
        ])
      );

      const gallery = firstNonEmpty(website, socialLink, "#");

      const image = website
        ? `https://image.thum.io/get/width/1200/crop/800/noanimate/${website}`
        : "https://via.placeholder.com/1200x800/f1eadf/6b5e52?text=Applicant+Preview";

      return {
        id: contact.id || "",
        firstName,
        lastName,
        name: fullName,
        email: firstNonEmpty(contact.email, contact.emailAddress, ""),
        medium,
        experience,
        statement,
        gallery,
        image
      };
    });

    return res.status(200).json(applicants);
  } catch (error) {
    console.error("jury-applicants error:", error);
    return res.status(500).json({
      error: "Failed to fetch applicants",
      detail: error.message
    });
  }
}
