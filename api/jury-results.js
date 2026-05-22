const REVIEW_FORM_ID = "0wAV3YF7Z0AXiZZQ8BXN";

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
    const apiKey = process.env.GHL_API_KEY;
    const locationId = process.env.GHL_LOCATION_ID;

    if (!apiKey || !locationId) {
      return res.status(500).json({
        step: "env-check",
        error: "Missing GHL_API_KEY or GHL_LOCATION_ID",
        hasApiKey: !!apiKey,
        hasLocationId: !!locationId
      });
    }

    const url = new URL("https://services.leadconnectorhq.com/forms/submissions");
    url.searchParams.set("locationId", locationId);
    url.searchParams.set("formId", REVIEW_FORM_ID);
    url.searchParams.set("limit", "5");
    url.searchParams.set("page", "1");

    console.log("jury-results debug start");
    console.log("locationId:", locationId);
    console.log("formId:", REVIEW_FORM_ID);
    console.log("request url:", url.toString());

    const response = await fetch(url.toString(), {
      method: "GET",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        Version: "2021-07-28",
        Accept: "application/json"
      }
    });

    const rawText = await response.text();

    console.log("HighLevel status:", response.status);
    console.log("HighLevel rawText:", rawText);

    if (!response.ok) {
      return res.status(500).json({
        step: "ghl-fetch",
        status: response.status,
        error: "HighLevel request failed",
        responseText: rawText
      });
    }

    let json;
    try {
      json = JSON.parse(rawText);
    } catch (parseError) {
      return res.status(500).json({
        step: "json-parse",
        error: "HighLevel response was not valid JSON",
        responseText: rawText
      });
    }

    const submissions =
      json.submissions ||
      json.data ||
      json.results ||
      json.items ||
      [];

    return res.status(200).json({
      step: "success",
      formId: REVIEW_FORM_ID,
      topLevelKeys: Object.keys(json || {}),
      submissionsIsArray: Array.isArray(submissions),
      submissionsCount: Array.isArray(submissions) ? submissions.length : 0,
      firstSubmission: Array.isArray(submissions) && submissions.length ? submissions[0] : null
    });
  } catch (error) {
    console.error("jury-results fatal error:", error);

    return res.status(500).json({
      step: "catch",
      error: error.message || "Unknown error"
    });
  }
}
