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

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const apiKey = process.env.GHL_PRIVATE_TOKEN || process.env.GHL_API_KEY;
    const locationId = process.env.GHL_LOCATION_ID;

    if (!apiKey || !locationId) {
      return res.status(500).json({
        error: "Missing required environment variables: GHL_PRIVATE_TOKEN/GHL_API_KEY or GHL_LOCATION_ID"
      });
    }

    const submissions = await fetchAllFormSubmissions({
      apiKey,
      locationId,
      formId: REVIEW_FORM_ID
    });

    const deduped = new Map();

    for (const submission of submissions) {
      const review = transformSubmissionToReview(submission);
      if (!review) continue;

      const jurorEmail = normalize(review.juror_email);
      const applicantEmail = normalize(review.applicant_email);
      const score = toNumber(review.score);

      if (!jurorEmail || !applicantEmail || score === null) continue;

      const lockKey = `${jurorEmail}::${applicantEmail}`;
      const incoming = {
        juror_email: jurorEmail,
        juror_name: cleanString(review.juror_name),
        applicant_email: applicantEmail,
        applicant_name: cleanString(review.applicant_name),
        score,
        submitted_at: review.submitted_at || null,
        lock_key: lockKey
      };

      const existing = deduped.get(lockKey);
      if (!existing || parseDateValue(incoming.submitted_at) >= parseDateValue(existing.submitted_at)) {
        deduped.set(lockKey, incoming);
      }
    }

    return res.status(200).json(Array.from(deduped.values()));
  } catch (error) {
    console.error("jury-reviewed error:", error);
    return res.status(500).json({
      error: "Failed to build reviewed locks",
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
  const params = getQueryParamsFromUrl(documentURL);

  const jurorName =
    cleanString(others[FIELD_IDS.jurorName]) ||
    cleanString(params.juror_name) ||
    "";

  const jurorEmail =
    cleanString(params.juror_email) ||
    cleanString(others.juror_email) ||
    "";

  const applicantName =
    cleanString(others[FIELD_IDS.applicantName]) ||
    cleanString(params.applicant_name) ||
    [cleanString(params.applicant_first_name), cleanString(params.applicant_last_name)].filter(Boolean).join(" ").trim();

  const applicantEmail =
    cleanString(others[FIELD_IDS.applicantEmail]) ||
    cleanString(params.applicant_email) ||
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
    juror_name: jurorName,
    juror_email: jurorEmail,
    applicant_name: applicantName,
    applicant_email: applicantEmail,
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
