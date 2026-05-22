// api/jury-results.js
module.exports = async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "https://waowconnect.org");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  const GHL_TOKEN = process.env.GHL_PRIVATE_TOKEN;
  const LOCATION_ID = process.env.GHL_LOCATION_ID;
  const JURY_FORM_ID = "0wAV3YF7Z0AXiZZQ8BXN";

  const safeString = (value) => String(value ?? "").trim();
  const normalize = (value) => safeString(value).toLowerCase();

  async function fetchAllSubmissions() {
    const all = [];
    let page = 1;
    let keepGoing = true;

    while (keepGoing) {
      const response = await fetch(
        `https://services.leadconnectorhq.com/forms/submissions?locationId=${LOCATION_ID}&limit=100&page=${page}`,
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
        throw new Error(`Forms submissions fetch failed: ${response.status} ${errorText}`);
      }

      const data = await response.json();
      const batch = Array.isArray(data.submissions) ? data.submissions : [];
      all.push(...batch);

      if (batch.length < 100) {
        keepGoing = false;
      } else {
        page += 1;
      }
    }

    return all;
  }

  try {
    const submissions = await fetchAllSubmissions();

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
          } catch (e) {}
        }

        if (!applicantEmail) {
          applicantEmail =
            others.pfq5RHMP8a30AYA2TZX5 ||
            others.applicant_email ||
            "";
        }

        if (!applicantName) {
          applicantName =
            others.nxpI696jzQq1ScBZNcBd ||
            others.applicant_name ||
            "";
        }

        if (!jurorName) {
          jurorName = others.S9MNF8KaH0qXcNmk0mca || others.juror_name || "";
        }

        if (!jurorEmail) {
          jurorEmail = others.juror_email || "";
        }

        const scoreRaw =
          contact._overall_jury_score ||
          others._overall_jury_score ||
          others.overall_jury_score ||
          "";

        const score = Number(scoreRaw);
        const validScore = Number.isFinite(score) && score > 0 ? score : null;

        return {
          applicant_email: safeString(applicantEmail),
          applicant_name: safeString(applicantName),
          juror_email: safeString(jurorEmail),
          juror_name: safeString(jurorName),
          score: validScore,
          submitted_at: sub.dateAdded || sub.createdAt || sub.updatedAt || null,
          submission_id: sub.id || sub._id || ""
        };
      })
      .filter((review) =>
        review.applicant_email &&
        review.juror_email &&
        review.score !== null
      );

    const perPairLatest = new Map();

    rawReviews.forEach((review) => {
      const key = `${normalize(review.juror_email)}::${normalize(review.applicant_email)}`;
      const existing = perPairLatest.get(key);

      if (!existing) {
        perPairLatest.set(key, review);
        return;
      }

      const existingTime = existing.submitted_at ? new Date(existing.submitted_at).getTime() : 0;
      const reviewTime = review.submitted_at ? new Date(review.submitted_at).getTime() : 0;

      if (reviewTime >= existingTime) {
        perPairLatest.set(key, review);
      }
    });

    const dedupedReviews = Array.from(perPairLatest.values());
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

      resultsByApplicant[key].review_count += 1;
      resultsByApplicant[key].total_score += review.score;
      resultsByApplicant[key].juror_scores.push({
        juror_email: review.juror_email,
        juror_name: review.juror_name,
        score: review.score,
        submitted_at: review.submitted_at,
        submission_id: review.submission_id
      });
    });

    const resultArray = Object.values(resultsByApplicant)
      .map((item) => ({
        ...item,
        average_score: item.review_count
          ? Math.round((item.total_score / item.review_count) * 100) / 100
          : 0
      }))
      .sort((a, b) => {
        if (b.average_score !== a.average_score) return b.average_score - a.average_score;
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
