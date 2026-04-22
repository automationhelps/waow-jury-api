export default async function handler(req, res) {
  const GHL_TOKEN = process.env.GHL_PRIVATE_TOKEN;
  const LOCATION_ID = process.env.GHL_LOCATION_ID;

  try {
    const response = await fetch(
      `https://services.leadconnectorhq.com/forms/submissions?locationId=${LOCATION_ID}&limit=100&page=1`,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${GHL_TOKEN}`,
          Version: "2021-07-28"
        }
      }
    );

    const data = await response.json();

    const submissions = data.submissions || [];

    const reviews = submissions.map(sub => {
      const fields = sub.fields || [];

      const getValue = (label) => {
        const f = fields.find(f => f.name === label);
        return f ? f.value : "";
      };

      return {
        applicant_email: getValue("Applicant Email"),
        juror_name: getValue("Juror Name")
      };
    });

    res.status(200).json(reviews);

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch reviews" });
  }
}
