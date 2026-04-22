export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  const GHL_TOKEN = process.env.GHL_PRIVATE_TOKEN;
  const GHL_LOCATION_ID = process.env.GHL_LOCATION_ID;

  function getCustomValue(customFields, fieldId) {
    const field = customFields.find(f => f.id === fieldId);
    return field ? field.value : "";
  }

  function extractImageFromHTML(html) {
    if (!html || typeof html !== "string") return "";

    const ogImageMatch = html.match(/<meta\s+property=["']og:image["']\s+content=["']([^"']+)["']/i);
    if (ogImageMatch && ogImageMatch[1]) return ogImageMatch[1];

    const twitterImageMatch = html.match(/<meta\s+name=["']twitter:image["']\s+content=["']([^"']+)["']/i);
    if (twitterImageMatch && twitterImageMatch[1]) return twitterImageMatch[1];

    const imgMatch = html.match(/<img[^>]+src=["']([^"']+)["']/i);
    if (imgMatch && imgMatch[1]) return imgMatch[1];

    return "";
  }

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

    const applicants = (data.contacts || []).map(contact => {
      const customFields = contact.customFields || [];

      const htmlContent = getCustomValue(customFields, "q1XivxZMYIFL8MbSnwGt");

      return {
        id: contact.id,
        firstName: contact.firstName || "",
        lastName: contact.lastName || "",
        name: `${contact.firstName || ""} ${contact.lastName || ""}`.trim(),
        email: contact.email || "",

        medium: getCustomValue(customFields, "MwjoxLsrbupQoS2lv9WN"),
        experience: getCustomValue(customFields, "10Nlt5l6NedE6NOSPxkT"),
        statement: getCustomValue(customFields, "drOsXj2ScM7Y9i1j14sk"),

        gallery:
          contact.website ||
          getCustomValue(customFields, "2snUBhDdrBxJOT6cqswf"),

        image:
          extractImageFromHTML(htmlContent) ||
          "https://via.placeholder.com/1200x800?text=Applicant"
      };
    });

    res.status(200).json(applicants);
  } catch (error) {
    console.error("Error fetching applicants:", error);
    res.status(500).json({ error: "Failed to fetch applicants" });
  }
}
