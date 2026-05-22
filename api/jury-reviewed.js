module.exports = async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "https://waowconnect.org");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  const GHL_TOKEN = process.env.GHL_PRIVATE_TOKEN;
  const LOCATION_ID = process.env.GHL_LOCATION_ID;
  const REVIEW_FORM_ID = "0wAV3YF7Z0AXiZZQ8BXN";

  const safeString = (value) => String(value ?? "").trim();
  const normalize = (value) => safeString(value).toLowerCase();

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

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Reviewed submissions failed: ${response.status} ${errorText}`);
    }

    const data = await response.json();
    const submissions = Array.isArray(data.submissions) ? data.submissions : [];

    const rawReviews = submissions
      .filter((sub) => sub.formId === REVIEW_FORM_ID)
      .map((sub) => {
        const others = sub.others || {};
        const docUrl = others?.eventData?.documentURL || "";

        let applicantEmail = "";
        let applicantName = "";
        let jurorName = "";
        let jurorEmail = "";

        if (docUrl) {
          try {
            const url = new URL(docUrl);
            applicantEmail = url.searchParams.get("applicant_email") || "";
            applicantName = url.searchParams.get("applicant_name") || "";
            jurorName = url.searchParams.get("juror_name") || "";
            jurorEmail = url.searchParams.get("juror_email") || "";
          } catch (e) {}
        }

        if (!applicantEmail) applicantEmail = others.pfq5RHMP8a30AYA2TZX5 || others.applicant_email || "";
        if (!applicantName) applicantName = others.nxpI696jzQq1ScBZNcBd || others.applicant_name || "";
        if (!jurorName) jurorName = others.S9MNF8KaH0qXcNmk0mca || others.juror_name || "";
        if (!jurorEmail) jurorEmail = others.juror_email || "";

        return {
          applicant_email: safeString(applicantEmail),
          applicant_name: safeString(applicantName),
          juror_name: safeString(jurorName),
          juror_email: safeString(jurorEmail),
          submitted_at: sub.dateAdded || sub.createdAt || "",
          submission_id: sub.id || sub._id || ""
        };
      })
      .filter((r) => {
        return (r.juror_name || r.juror_email) && (r.applicant_email || r.applicant_name);
      });

    const uniqueMap = new Map();

    rawReviews.forEach((review) => {
      const uniqueKey = [
        normalize(review.juror_email || review.juror_name),
        normalize(review.applicant_email || review.applicant_name)
      ].join("::");

      if (!uniqueMap.has(uniqueKey)) {
        uniqueMap.set(uniqueKey, review);
      }
    });

    const reviews = Array.from(uniqueMap.values());

    return res.status(200).json(reviews);
  } catch (err) {
    console.error("jury-reviewed error:", err);
    return res.status(500).json({
      error: "Failed to fetch reviews",
      detail: err.message
    });
  }
};
