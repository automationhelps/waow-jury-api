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

    const normalize = (value) =>
      String(value || "")
        .trim()
        .toLowerCase()
        .replace(/\{\{|\}\}/g, "")
        .replace(/^contact\./, "")
        .replace(/[^a-z0-9]+/g, "_")
        .replace(/^_+|_+$/g, "");

    const getCustomFieldValue = (contact, possibleNames = []) => {
      const wanted = possibleNames.map(normalize);

      // case 1: customFields is an array
      if (Array.isArray(contact.customFields)) {
        for (const field of contact.customFields) {
          const candidates = [
            field.key,
            field.name,
            field.fieldKey,
            field.id,
            field.label
          ].map(normalize);

          const matched = candidates.some((candidate) => wanted.includes(candidate));
          if (matched && field.value !== undefined && field.value !== null && String(field.value).trim() !== "") {
            return field.value;
          }
        }
      }

      // case 2: customFields is an object map
      if (contact.customFields && typeof contact.customFields === "object" && !Array.isArray(contact.customFields)) {
        for (const [key, value] of Object.entries(contact.customFields)) {
          if (wanted.includes(normalize(key)) && value !== undefined && value !== null && String(value).trim() !== "") {
            return value;
          }
        }
      }

      // case 3: direct contact properties fallback
      for (const name of possibleNames) {
        const direct = contact[name];
        if (direct !== undefined && direct !== null && String(direct).trim() !== "") {
          return direct;
        }
      }

      return "";
    };

    const applicants = contacts.map((contact) => {
      const firstName = contact.firstName || "";
      const lastName = contact.lastName || "";
      const fullName = `${firstName} ${lastName}`.trim() || contact.name || "";

      const medium = getCustomFieldValue(contact, [
        "mediums",
        "Mediums",
        "contact.mediums"
      ]);

      const experience = getCustomFieldValue(contact, [
        "experience_level",
        "Experience Level",
        "contact.experience_level"
      ]);

      const statement = getCustomFieldValue(contact, [
        "artist_statement_notes",
        "Artist Statement / Notes",
        "contact.artist_statement_notes"
      ]);

      const website = getCustomFieldValue(contact, [
        "website",
        "Website",
        "contact.website"
      ]);

      const socialLink = getCustomFieldValue(contact, [
        "facebook_or_instagram_page_link",
        "Facebook Or Instagram Page Link",
        "contact.facebook_or_instagram_page_link"
      ]);

      const gallery = website || socialLink || "#";

      const image = website
        ? `https://image.thum.io/get/width/1200/crop/800/noanimate/${website}`
        : "https://via.placeholder.com/1200x800/f1eadf/6b5e52?text=Applicant+Preview";

      return {
        id: contact.id || "",
        firstName,
        lastName,
        name: fullName,
        email: contact.email || "",
        medium: medium || "Medium not provided",
        experience: experience || "Experience not provided",
        statement: statement || "No artist statement provided.",
        gallery,
        image
      };
    });

    console.log(
      "jury-applicants sample:",
      JSON.stringify(
        applicants.slice(0, 3),
        null,
        2
      )
    );

    return res.status(200).json(applicants);
  } catch (error) {
    console.error("jury-applicants error:", error);
    return res.status(500).json({ error: "Failed to fetch applicants" });
  }
}
