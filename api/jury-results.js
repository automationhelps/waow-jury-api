export default async function handler(req, res) {
  return res.status(200).json({
    hasGhlApiKey: !!process.env.GHL_API_KEY,
    hasGhlLocationId: !!process.env.GHL_LOCATION_ID,
    hasGhlJuryFormId: !!process.env.GHL_JURY_FORM_ID
  });
}

  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  try {
    const apiKey = process.env.GHL_API_KEY;
    const locationId = process.env.GHL_LOCATION_ID;
    const formId = process.env.GHL_JURY_FORM_ID;

    if (!apiKey || !locationId || !formId) {
      return res.status(500).json({
        error: "Missing required environment variables: GHL_API_KEY, GHL_LOCATION_ID, GHL_JURY_FORM_ID"
      });
    }

    const submissions = await fetchAllFormSubmissions({
      apiKey,
      locationId,
      formId
    });

    const flattenedReviews = submissions
      .map(transformSubmissionToReview)
      .filter(Boolean);

    const groupedApplicants = new Map();

    for (const review of flattenedReviews) {
      const applicantEmail = normalize(review.applicant_email);
      const jurorEmail = normalize(review.juror_email);
      const score = toNumber(review.score);

      if (!applicantEmail || !jurorEmail || score === null) continue;

      if (!groupedApplicants.has(applicantEmail)) {
        groupedApplicants.set(applicantEmail, {
          applicant_email: applicantEmail,
          applicant_name: cleanString(review.applicant_name),
          juror_scores_map: new Map()
        });
      }

      const applicant = groupedApplicants.get(applicantEmail);
      const dedupeKey = `${applicantEmail}::${jurorEmail}`;

      const incomingRecord = {
        juror_name: cleanString(review.juror_name),
        juror_email: jurorEmail,
        score,
        submitted_at: review.submitted_at || null
      };

      const existing = applicant.juror_scores_map.get(dedupeKey);

      if (!existing) {
        applicant.juror_scores_map.set(dedupeKey, incomingRecord);
      } else {
        const existingTime = parseDateValue(existing.submitted_at);
        const incomingTime = parseDateValue(incomingRecord.submitted_at);

        if (incomingTime >= existingTime) {
          applicant.juror_scores_map.set(dedupeKey, incomingRecord);
        }
      }

      if (!applicant.applicant_name && review.applicant_name) {
        applicant.applicant_name = cleanString(review.applicant_name);
      }
    }

    const results = Array.from(groupedApplicants.values())
      .map((applicant) => {
        const jurorScores = Array.from(applicant.juror_scores_map.values()).sort(
          (a, b) => parseDateValue(b.submitted_at) - parseDateValue(a.submitted_at)
        );

        const totalScore = jurorScores.reduce((sum, item) => sum + item.score, 0);
        const reviewCount = jurorScores.length;
        const averageScore = reviewCount ? totalScore / reviewCount : 0;

        return {
          applicant_email: applicant.applicant_email,
          applicant_name: applicant.applicant_name || applicant.applicant_email,
          review_count: reviewCount,
          total_score: totalScore,
          average_score: Number(averageScore.toFixed(2)),
          juror_scores: jurorScores
        };
      })
      .sort((a, b) => {
        if (b.average_score !== a.average_score) {
          return b.average_score - a.average_score;
        }
        if (b.total_score !== a.total_score) {
          return b.total_score - a.total_score;
        }
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
  let keepGoing = true;

  while (keepGoing) {
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

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`HighLevel API failed on page ${page}: ${response.status} ${text}`);
    }

    const json = await response.json();

    const items =
      json.submissions ||
      json.data ||
      json.results ||
      json.items ||
      [];

    if (!Array.isArray(items)) {
      throw new Error("Unexpected HighLevel response shape: submissions array not found");
    }

    all.push(...items);

    if (items.length < limit) {
      keepGoing = false;
    } else {
      page += 1;
    }
  }

  return all;
}

function transformSubmissionToReview(submission) {
  const fieldMap = extractFieldMap(submission);

  const applicantEmail =
    firstValue(
      fieldMap,
      [
        "applicant_email",
        "applicant email",
        "email",
        "artist_email",
        "artist email"
      ]
    );

  const applicantName =
    firstValue(
      fieldMap,
      [
        "applicant_name",
        "applicant name",
        "artist_name",
        "artist name",
        "name"
      ]
    ) || buildNameFromParts(fieldMap, "applicant");

  const jurorEmail =
    firstValue(
      fieldMap,
      [
        "juror_email",
        "juror email",
        "reviewer_email",
        "reviewer email"
      ]
    );

  const jurorName =
    firstValue(
      fieldMap,
      [
        "juror_name",
        "juror name",
        "reviewer_name",
        "reviewer name"
      ]
    ) || buildNameFromParts(fieldMap, "juror");

  const score =
    firstValue(
      fieldMap,
      [
        "score",
        "jury_score",
        "jury score",
        "rating",
        "total_score",
        "total score"
      ]
    );

  const submittedAt =
    submission.submittedAt ||
    submission.createdAt ||
    submission.dateAdded ||
    submission.updatedAt ||
    null;

  return {
    applicant_email: applicantEmail,
    applicant_name: applicantName,
    juror_email: jurorEmail,
    juror_name: jurorName,
    score,
    submitted_at: submittedAt
  };
}

function extractFieldMap(submission) {
  const map = {};

  const possibleCollections = [
    submission?.fields,
    submission?.customFields,
    submission?.responses,
    submission?.formData
  ];

  for (const collection of possibleCollections) {
    if (Array.isArray(collection)) {
      for (const item of collection) {
        const key = normalizeFieldKey(
          item?.fieldKey ||
          item?.key ||
          item?.name ||
          item?.label
        );

        const value =
          item?.fieldValue ??
          item?.value ??
          item?.answer ??
          item?.text ??
          "";

        if (key && value !== undefined && value !== null && String(value).trim() !== "") {
          map[key] = String(value).trim();
        }
      }
    } else if (collection && typeof collection === "object") {
      for (const [rawKey, rawValue] of Object.entries(collection)) {
        const key = normalizeFieldKey(rawKey);
        if (key && rawValue !== undefined && rawValue !== null && String(rawValue).trim() !== "") {
          map[key] = String(rawValue).trim();
        }
      }
    }
  }

  if (submission?.contact && typeof submission.contact === "object") {
    const contact = submission.contact;

    if (contact.email && !map["email"]) {
      map["email"] = String(contact.email).trim();
    }

    const fullName = [contact.firstName, contact.lastName].filter(Boolean).join(" ").trim();
    if (fullName && !map["name"]) {
      map["name"] = fullName;
    }
  }

  return map;
}

function firstValue(fieldMap, keys) {
  for (const key of keys) {
    const normalizedKey = normalizeFieldKey(key);
    if (fieldMap[normalizedKey]) {
      return fieldMap[normalizedKey];
    }
  }
  return "";
}

function buildNameFromParts(fieldMap, type) {
  const first =
    firstValue(fieldMap, [
      `${type}_first_name`,
      `${type} first name`,
      `${type}_firstname`,
      `${type} firstname`
    ]) || "";

  const last =
    firstValue(fieldMap, [
      `${type}_last_name`,
      `${type} last name`,
      `${type}_lastname`,
      `${type} lastname`
    ]) || "";

  return [first, last].filter(Boolean).join(" ").trim();
}

function normalizeFieldKey(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
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
