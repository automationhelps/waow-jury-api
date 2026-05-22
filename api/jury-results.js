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
    const apiKey = process.env.GHL_PRIVATE_TOKEN;
    const locationId = process.env.GHL_LOCATION_ID;

    if (!apiKey || !locationId) {
      return res.status(500).json({
        step: "env-check",
        error: "Missing GHL_PRIVATE_TOKEN or GHL_LOCATION_ID",
        hasPrivateToken: !!apiKey,
        hasLocationId: !!locationId
      });
    }

    return res.status(200).json({
      step: "env-check-passed",
      hasPrivateToken: !!apiKey,
      hasLocationId: !!locationId,
      formId: REVIEW_FORM_ID
    });
  } catch (error) {
    return res.status(500).json({
      step: "catch",
      error: error.message || "Unknown error"
    });
  }
}
