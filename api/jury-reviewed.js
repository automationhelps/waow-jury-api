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
    const submissions = Array.isArray(data.submissions) ? data.submissions : [];

    const reviews = submissions
      .filter(sub => sub.formId === "0wAV3YF7Z0AXiZZQ8BXN")
      .map(sub => {
        const others = sub.others || {};
        const docUrl = others?.eventData?.documentURL || "";

        let applicantEmail = "";
        let applicantName = "";
        let jurorName = "";

        if (docUrl) {
          try {
            const url = new URL(docUrl);
            applicantEmail = url.searchParams.get("applicant_email") || "";
            applicantName = url.searchParams.get("applicant_name") || "";
            jurorName = url.searchParams.get("juror_name") || "";
          } catch (e) {}
        }

        if (!applicantEmail) applicantEmail = others.pfq5RHMP8a30AYA2TZX5 || "";
        if (!applicantName) applicantName = others.nxpI696jzQq1ScBZNcBd || "";
        if (!jurorName) jurorName = others.S9MNF8KaH0qXcNmk0mca || "";

        return {
          applicant_email: String(applicantEmail).trim(),
          applicant_name: String(applicantName).trim(),
          juror_name: String(jurorName).trim()
        };
      })
      .filter(r => r.juror_name && (r.applicant_email || r.applicant_name));

    res.status(200).json(reviews);
  } catch (err) {
    console.error("jury-reviewed error:", err);
    res.status(500).json({ error: "Failed to fetch reviews" });
  }
}
