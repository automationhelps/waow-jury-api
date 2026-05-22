const REVIEW_FORM_ID = "0wAV3YF7Z0AXiZZQ8BXN";

const FIELD_IDS = {
  jurorName: "S9MNF8KaH0qXcNmk0mca",
  applicantName: "nxpI696jzQq1ScBZNcBd",
  applicantEmail: "pfq5RHMP8a30AYA2TZX5",
  score: "mTqnqJUZB3hcNNckPnel"
};

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const apiKey = process.env.GHL_PRIVATE_TOKEN;
    const locationId = process.env.GHL_LOCATION_ID;

    if (!apiKey || !locationId) {
      return res.status(500).json({
        error: "Missing GHL_PRIVATE_TOKEN or GHL_LOCATION_ID"
      });
    }

    const submissions = await fetchAllFormSubmissions({
      apiKey,
      locationId,
      formId: REVIEW_FORM_ID
    });

    const reviews = submissions
      .map(transformSubmissionToReview)
      .filter(Boolean);

    const applicantsMap = new Map();

    for (const review of reviews) {
      const applicantEmail = normalize(review.applicant_email);
      const jurorEmail = normalize(review.juror_email);
      const score = toNumber(review.score);

      if (!applicantEmail || !jurorEmail || score === null) continue;

      if (!applicantsMap.has(applicantEmail)) {
        applicantsMap.set(applicantEmail, {
          applicant_email: applicantEmail,
          applicant_name: cleanString(review.applicant_name) || applicantEmail,
          juror_scores_map: new Map()
        });
      }

      const applicant = applicantsMap.get(applicantEmail);
      const dedupeKey = `${applicantEmail}::${jurorEmail}`;

      const incoming = {
        juror_name: cleanString(review.juror_name),
        juror_email: jurorEmail,
        score,
        submitted_at: review.submitted_at || null,
        submission_id: review.submission_id || null
      };

      const existing = applicant.juror_scores_map.get(dedupeKey);

      if (!existing) {
        applicant.juror_scores_map.set(dedupeKey, incoming);
      } else {
        const existingTime = parseDateValue(existing.submitted_at);
        const incomingTime = parseDateValue(incoming.submitted_at);

        if (incomingTime >= existingTime) {
          applicant.juror_scores_map.set(dedupeKey, incoming);
        }
      }

      if (
        (!applicant.applicant_name || applicant.applicant_name === applicantEmail) &&
        cleanString(review.applicant_name)
      ) {
        applicant.applicant_name = cleanString(review.applicant_name);
      }
    }

    const results = Array.from(applicantsMap.values())
      .map((applicant) => {
        const jurorScores = Array.from(applicant.juror_scores_map.values()).sort(
          (a, b) => parseDateValue(b.submitted_at) - parseDateValue(a.submitted_at)
        );

        const totalScore = jurorScores.reduce((sum, item) => sum + item.score, 0);
        const reviewCount = jurorScores.length;
        const averageScore = reviewCount ? totalScore / reviewCount : 0;

        return {
          applicant_email: applicant.applicant_email,
          applicant_name: applicant.applicant_name,
          review_count: reviewCount,
          total_score: totalScore,
          average_score: Number(averageScore.toFixed(2)),
          juror_scores: jurorScores
        };
      })
      .sort((a, b) => {
        if (b.average_score !== a.average_score) return b.average_score - a.average_score;
        if (b.total_score !== a.total_score) return b.total_score - a.total_score;
        return a.applicant_name.localeCompare(b.applicant_name);
      });

    return res.status(200).json(results);
  } catch (error) {
    console.error("jury-results error:", error);
    return res.status(500).json({
      error: "Failed to build jury results",
      details: error.message || "Unknown error"
    });
  }
}

async function fetchAllFormSubmissions({ apiKey, locationId, formId }) {
  const all = [];
  let page = 1;
  const limit = 100;
  let hasMore = true;

  while (hasMore) {
    const url = new URL("https://services.leadconnectorhq.com/forms/submissions");
    url.searchParams.set("locationId", locationId);
    url.searchParams.set("formId", formId);
    url.searchParams.set("limit", String(limit));
    url.searchParams.set("page", String(page));

    const response = await fetch(url.toString(), {
      method: "GET",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        Version: "2021-07-28",
        Accept: "application/json"
      }
    });

    const rawText = await response.text();

    if (!response.ok) {
      throw new Error(`HighLevel API failed on page ${page}: ${response.status} ${rawText}`);
    }

    let json;
    try {
      json = JSON.parse(rawText);
    } catch {
      throw new Error(`Invalid JSON from HighLevel on page ${page}: ${rawText}`);
    }

    const items = Array.isArray(json.submissions) ? json.submissions : [];

    all.push(...items);

    if (items.length < limit) {
      hasMore = false;
    } else {
      page += 1;
    }
  }

  return all;
}

function transformSubmissionToReview(submission) {
  const others = submission?.others || {};
  const eventData = others?.eventData || {};
  const documentURL = eventData?.documentURL || "";

  const documentParams = getQueryParamsFromUrl(documentURL);

  const jurorName =
    cleanString(others[FIELD_IDS.jurorName]) ||
    cleanString(documentParams.juror_name) ||
    "";

  const jurorEmail =
    cleanString(documentParams.juror_email) ||
    cleanString(others.juror_email) ||
    "";

  const applicantName =
    cleanString(others[FIELD_IDS.applicantName]) ||
    cleanString(documentParams.applicant_name) ||
    [cleanString(documentParams.applicant_first_name), cleanString(documentParams.applicant_last_name)]
      .filter(Boolean)
      .join(" ")
      .trim();

  const applicantEmail =
    cleanString(others[FIELD_IDS.applicantEmail]) ||
    cleanString(documentParams.applicant_email) ||
    "";

  const score =
    others[FIELD_IDS.score] ??
    others.overall_jury_score ??
    others.score ??
    null;

  const submittedAt =
    submission.createdAt ||
    submission.updatedAt ||
    null;

  return {
    submission_id: submission.id || others.submissionId || null,
    applicant_email: applicantEmail,
    applicant_name: applicantName,
    juror_email: jurorEmail,
    juror_name: jurorName,
    score,
    submitted_at: submittedAt
  };
}

function getQueryParamsFromUrl(url) {
  try {
    const parsed = new URL(url);
    return Object.fromEntries(parsed.searchParams.entries());
  } catch {
    return {};
  }
}

function normalize(value) {
  return String(value || "").trim().toLowerCase();
}

function cleanString(value) {
  return String(value || "").trim();
}

function toNumber(value) {
  if (value === null || value === undefined) return null;
  const cleaned = String(value).replace(/[^0-9.\-]/g, "").trim();
  if (!cleaned) return null;
  const num = Number(cleaned);
  return Number.isFinite(num) ? num : null;
}

function parseDateValue(value) {
  const time = new Date(value || 0).getTime();
  return Number.isFinite(time) ? time : 0;
}
