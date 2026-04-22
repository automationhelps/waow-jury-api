export default async function handler(req, res) {
  const GHL_TOKEN = process.env.GHL_PRIVATE_TOKEN;
  const LOCATION_ID = process.env.GHL_LOCATION_ID;

  try {
    const response = await fetch(
      `https://services.leadconnectorhq.com/forms/submissions?locationId=${LOCATION_ID}`,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${GHL_TOKEN}`,
          Version: "2021-07-28"
        }
      }
    );

    const data = await response.json();
    res.status(200).json(data);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch reviews" });
  }
}
