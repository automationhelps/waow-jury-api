export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "https://waowconnect.org");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  const GHL_TOKEN = process.env.GHL_PRIVATE_TOKEN;
  const GHL_LOCATION_ID = process.env.GHL_LOCATION_ID;
  const API_BASE = "https://services.leadconnectorhq.com";
  const APPLICATION_FORM_ID = "y3ZrmkAfeM1cZtuf2d8F";

  const ghlHeaders = {
    Authorization: `Bearer ${GHL_TOKEN}`,
    Version: "2021-07-28",
    "Content-Type": "application/json"
  };

  const safeString = (value) => String(value ?? "").trim();

  try {
    // 1) Find contacts tagged ready for jury
    const contactSearchResponse = await fetch(`${API_BASE}/contacts/search`, {
      method: "POST",
      headers: ghlHeaders,
      body: JSON.stringify({
        locationId: GHL_LOCATION_ID,
        page: 1,
        pageLimit: 100,
        filters: [
          {
            field: "tags",
            operator: "contains",
            value: "ready for jury"
          }
        ]
      })
    });

    if (!contactSearchResponse.ok) {
      const errorText = await contactSearchResponse.text();
      throw new Error(`Search Contacts failed: ${contactSearchResponse.status} ${errorText}`);
    }

    const contactSearchData = await contactSearchResponse.json();
    const taggedContacts = Array.isArray(contactSearchData.contacts)
      ? contactSearchData.contacts
      : [];

    // 2) Pull submissions
    const submissionsResponse = await fetch(
      `${API_BASE}/forms/submissions?locationId=${GHL_LOCATION_ID}&limit=100&page=1`,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${GHL_TOKEN}`,
          Version: "2021-07-28"
        }
      }
    );

    if (!submissionsResponse.ok) {
      const errorText = await submissionsResponse.text();
      throw new Error(`Form submissions failed: ${submissionsResponse.status} ${errorText}`);
    }

    const submissionsData = await submissionsResponse.json();
    const submissions = Array.isArray(submissionsData.submissions)
      ? submissionsData.submissions
      : [];

    const applicationSubmissions = submissions.filter(
      (sub) => sub.formId === APPLICATION_FORM_ID
    );

    // Build lookup by applicant email from application submissions
    const submissionByEmail = {};

    applicationSubmissions.forEach((sub) => {
      const others = sub.others || {};
      const email = safeString(others.email).toLowerCase();
      if (!email) return;

      const firstName = safeString(others.first_name);
      const lastName = safeString(others.last_name);
      const fullName =
        safeString(sub.name) ||
        safeString(others.full_name) ||
        `${firstName} ${lastName}`.trim();

      const website = safeString(others.website);
      const socialLink = safeString(others.r6gpxefXNTk3iCtE5iA3);
      const gallery = website || socialLink || "#";

      const experience =
        safeString(others.VWVo0DMHHKn1gEzy7plr) || "Experience not provided";

      let medium = "Medium not provided";
      if (Array.isArray(others.gID7o6vKL4nC15Ted4b5) && others.gID7o6vKL4nC15Ted4b5.length) {
        medium = others.gID7o6vKL4nC15Ted4b5.join(", ");
      } else if (safeString(others.MwjoxLsrbupQoS2lv9WN)) {
        medium = safeString(others.MwjoxLsrbupQoS2lv9WN);
      }

      const statement =
        safeString(others.JPmbfbljoUVBN6Idok6Q) ||
        safeString(others.drOsXj2ScM7Y9i1j14sk) ||
        "No artist statement provided.";

      const image = website
        ? `https://image.thum.io/get/width/1200/crop/800/noanimate/${website}`
        : "https://via.placeholder.com/1200x800/f1eadf/6b5e52?text=Applicant+Preview";

      submissionByEmail[email] = {
        firstName,
        lastName,
        name: fullName,
        email,
        medium,
        experience,
        statement,
        gallery,
        image
      };
    });

    // 3) Build applicants from tagged contacts, enriched from submissions if found
    const applicants = taggedContacts.map((contact) => {
      const email = safeString(contact.email).toLowerCase();
      const enriched = submissionByEmail[email] || null;

      const firstName = enriched?.firstName || safeString(contact.firstName);
      const lastName = enriched?.lastName || safeString(contact.lastName);
      const fullName =
        enriched?.name ||
        safeString(contact.name) ||
        `${firstName} ${lastName}`.trim();

      return {
        id: contact.id || email || fullName,
        firstName,
        lastName,
        name: fullName,
        email: email || safeString(contact.email),
        medium: enriched?.medium || "Medium not provided",
        experience: enriched?.experience || "Experience not provided",
        statement: enriched?.statement || "No artist statement provided.",
        gallery: enriched?.gallery || "#",
        image:
          enriched?.image ||
          "https://via.placeholder.com/1200x800/f1eadf/6b5e52?text=Applicant+Preview"
      };
    });

    console.log("Tagged contacts count:", taggedContacts.length);
    console.log("Application submissions count:", applicationSubmissions.length);
    console.log("Matched submission emails:", Object.keys(submissionByEmail));
    console.log("Applicants output:", applicants);

    return res.status(200).json(applicants);
  } catch (error) {
    console.error("jury-applicants error:", error);
    return res.status(500).json({
      error: "Failed to fetch applicants",
      detail: error.message
    });
  }
}
