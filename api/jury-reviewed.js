module.exports = async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "https://waowconnect.org");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
  res.setHeader("Pragma", "no-cache");
  res.setHeader("Expires", "0");
  res.setHeader("Surrogate-Control", "no-store");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  const GHL_TOKEN = process.env.GHL_PRIVATE_TOKEN;
  const LOCATION_ID = process.env.GHL_LOCATION_ID;
  const REVIEW_FORM_ID = "0wAV3YF7Z0AXiZZQ8BXN";

  const safeString = (value) => String(value ?? "").trim();
  const normalize = (value) => safeString(value).toLowerCase();

  const looksLikeEmail = (value) => {
    const v = safeString(value);
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
  };

  const pickFirst = (obj, keys = []) => {
    for (const key of keys) {
      const value = safeString(obj?.[key]);
      if (value) return value;
    }
    return "";
  };

  const findAnyEmailLikeValue = (obj) => {
    if (!obj || typeof obj !== "object") return "";

    for (const [key, value] of Object.entries(obj)) {
      const keyName = normalize(key);
      const stringValue = safeString(value);

      if (!stringValue) continue;

      if (
        keyName.includes("juror_email") ||
        keyName.includes("juror email") ||
        keyName === "email"
      ) {
        if (looksLikeEmail(stringValue)) return stringValue;
      }
    }

    for (const value of Object.values(obj)) {
      const stringValue = safeString(value);
      if (looksLikeEmail(stringValue)) return stringValue;
    }

    return "";
  };

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
        const eventData = others.eventData || {};
        const docUrl = eventData.documentURL || "";

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

        applicantEmail =
          applicantEmail ||
          pickFirst(others, ["pfq5RHMP8a30AYA2TZX5", "applicant_email"]);

        applicantName =
          applicantName ||
          pickFirst(others, ["nxpI696jzQq1ScBZNcBd", "applicant_name"]);

        jurorName =
          jurorName ||
          pickFirst(others, ["S9MNF8KaH0qXcNmk0mca", "juror_name"]);

        jurorEmail =
          jurorEmail ||
          pickFirst(others, ["juror_email", "email"]) ||
          findAnyEmailLikeValue(others);

        return {
          applicant_email: safeString(applicantEmail),
          applicant_name: safeString(applicantName),
          juror_name: safeString(jurorName),
          juror_email: safeString(jurorEmail),
          submitted_at: sub.dateAdded || sub.createdAt || "",
          submission_id: sub.id || sub._id || ""
        };
      })
      .filter((r) => (r.juror_name || r.juror_email) && (r.applicant_email || r.applicant_name));

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

    return res.status(200).json(Array.from(uniqueMap.values()));
  } catch (err) {
    console.error("jury-reviewed error:", err);
    return res.status(500).json({
      error: "Failed to fetch reviews",
      detail: err.message
    });
  }
};
