// api/jury-results.js
// Returns per-applicant jury results aggregated from LeadConnector form submissions

module.exports = async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "https://waowconnect.org");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  const GHL_TOKEN = process.env.GHL_PRIVATE_TOKEN;
  const LOCATION_ID = process.env.GHL_LOCATION_ID;
  const JURY_FORM_ID = "0wAV3YF7Z0AXiZZQ8BXN"; // same form you use for reviews

  const safeString = (value) => String(value ?? "").trim();
  const normalize = (value) => safeString(value).toLowerCase();

  try {
    // 1) Fetch form submissions from LeadConnector / HighLevel
    const response = await fetch(
      `https://services.leadconnectorhq.com/forms/submissions?locationId=${LOCATION_ID}&limit=200&page=1`,
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
      throw new Error(
        `Forms submissions fetch failed: ${response.status} ${errorText}`
      );
    }

    const data = await response.json();
    const submissions = Array.isArray(data.submissions) ? data.submissions : [];

    // 2) Normalize to one flat review object per form submission
    const rawReviews = submissions
      .filter((sub) => sub.formId === JURY_FORM_ID)
      .map((sub) => {
        const others = sub.others || {};
        const contact = sub.contact || {};

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
          } catch (e) {
            // ignore bad URL
          }
        }

        // Fallbacks from form fields / contact fields
        if (!applicantEmail)
          applicantEmail =
            others.pfq5RHMP8a30AYA2TZX5 ||
            others.applicant_email ||
            contact.email ||
            "";
        if (!applicantName)
          applicantName =
            others.nxpI696jzQq1ScBZNcBd ||
            others.applicant_name ||
            contact.name ||
            "";
        if (!jurorName)
          jurorName = others.S9MNF8KaH0qXcNmk0mca || others.juror_name || "";
        if (!jurorEmail)
          jurorEmail = others.juror_email || contact.juror_email || "";

        // Your custom field: {{contact._overall_jury_score}}
        const scoreRaw =
          contact._overall_jury_score ||
          others._overall_jury_score ||
          others.overall_jury_score ||
          "";

        const score = Number(scoreRaw);
        const validScore =
          Number.isFinite(score) && score > 0 ? score : null;

        const submittedAt =
          sub.dateAdded || sub.createdAt || sub.updatedAt || null;

        return {
          applicant_email: safeString(applicantEmail),
          applicant_name: safeString(applicantName),
          juror_email: safeString(jurorEmail),
          juror_name: safeString(jurorName),
          score: validScore,
          submitted_at: submittedAt,
          submission_id: sub.id || sub._id || ""
        };
      })
      .filter((review) => {
        // Must have applicant & juror emails and a valid score
        return (
          review.applicant_email &&
          review.juror_email &&
          review.score !== null
        );
      });

    // 3) Deduplicate: keep latest submission per juror-email + applicant-email pair
    const perPairLatest = new Map();

    rawReviews.forEach((review) => {
      const lockKey =
        normalize(review.juror_email) +
        "::" +
        normalize(review.applicant_email);
      const existing = perPairLatest.get(lockKey);

      if (!existing) {
        perPairLatest.set(lockKey, review);
      } else {
        // Compare timestamps; keep latest
        const existingTime = existing.submitted_at
          ? new Date(existing.submitted_at).getTime()
          : 0;
        const reviewTime = review.submitted_at
          ? new Date(review.submitted_at).getTime()
          : 0;

        if (reviewTime >= existingTime) {
          perPairLatest.set(lockKey, review);
        }
      }
    });

    const dedupedReviews = Array.from(perPairLatest.values());

    // 4) Group by applicant_email
    const resultsByApplicant = {};
    dedupedReviews.forEach((review) => {
      const key = normalize(review.applicant_email);
      if (!resultsByApplicant[key]) {
        resultsByApplicant[key] = {
          applicant_email: review.applicant_email,
          applicant_name: review.applicant_name,
          review_count: 0,
          total_score: 0,
          average_score: 0,
          juror_scores: []
        };
      }

      const bucket = resultsByApplicant[key];
      bucket.review_count += 1;
      bucket.total_score += review.score;
      bucket.juror_scores.push({
        juror_email: review.juror_email,
        juror_name: review.juror_name,
        score: review.score,
        submitted_at: review.submitted_at,
        submission_id: review.submission_id
      });
    });

    // 5) Compute averages
    Object.values(resultsByApplicant).forEach((app) => {
      if (app.review_count > 0) {
        app.average_score =
          Math.round(
            ((app.total_score / app.review_count) + Number.EPSILON) * 100
          ) / 100;
      } else {
        app.average_score = 0;
      }
    });

    // 6) Return as array
    const resultArray = Object.values(resultsByApplicant).sort((a, b) => {
      // Highest average first; tie-breaker by total score
      if (b.average_score !== a.average_score) {
        return b.average_score - a.average_score;
      }
      return b.total_score - a.total_score;
    });

    return res.status(200).json(resultArray);
  } catch (err) {
    console.error("jury-results error:", err);
    return res.status(500).json({
      error: "Failed to aggregate jury results",
      detail: err.message
    });
  }
};
