export default async function handler(req, res) {
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
            value: "Ready for Jury"
          }
        ]
      })
    });

    const data = await response.json();

    res.status(200).json(data.contacts || []);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to fetch applicants" });
  }
}
