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

  const normalizeUrl = (url) => {
    const clean = String(url || "").trim();
    if (!clean) return "";
    if (/^https?:\/\//i.test(clean)) return clean;
    return `https://${clean}`;
  };

  const safeString = (value) => String(value ?? "").trim();

  const ghlHeaders = {
    Authorization: `Bearer ${GHL_TOKEN}`,
    Version: "2021-07-28",
    "Content-Type": "application/json"
  };

  const pickFirst = (obj, keys, fallback = "") => {
    for (const key of keys) {
      const value = obj?.[key];

      if (Array.isArray(value) && value.length) {
        return value.map((v) => safeString(v)).filter(Boolean).join(", ");
      }

      if (safeString(value)) {
        return safeString(value);
      }
    }
    return fallback;
  };

  try {
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

    const submissionByEmail = {};

    applicationSubmissions.forEach((sub) => {
      const others = sub.others || {};
      console.log("==== FORM SUBMISSION DEBUG START ====");
console.log("Submission email:", others.email);
console.log("Available keys:", Object.keys(others));
console.log("Full others payload:", JSON.stringify(others, null, 2));
console.log("==== FORM SUBMISSION DEBUG END ====");
      console.log("SUBMISSION OTHERS:", JSON.stringify(others, null, 2));
      const email = safeString(others.email).toLowerCase();
      if (!email) return;

      const firstName = safeString(others.first_name);
      const lastName = safeString(others.last_name);
      const fullName =
        safeString(sub.name) ||
        safeString(others.full_name) ||
        `${firstName} ${lastName}`.trim();

      const rawWebsite = safeString(others.website);

      const socialLink = normalizeUrl(
        pickFirst(
          others,
          [
            "facebook_or_instagram_page_link",
            "r6gpxefXNTk3iCtE5iA3"
          ],
          ""
        )
      );

      const website = normalizeUrl(rawWebsite);
      const gallery = website || socialLink || "#";

      const experience = pickFirst(
        others,
        [
          "experience_level",
          "VWVo0DMHHKn1gEzy7plr"
        ],
        "Experience not provided"
      );

      const mediums = pickFirst(
        others,
        [
          "mediums",
          "gID7o6vKL4nC15Ted4b5",
          "MwjoxLsrbupQoS2lv9WN"
        ],
        "Medium not provided"
      );

      const statement = pickFirst(
        others,
        [
          "artist_statement_notes",
          "JPmbfbljoUVBN6Idok6Q",
          "drOsXj2ScM7Y9i1j14sk"
        ],
        "No artist statement provided."
      );

      const areasStrong = pickFirst(
        others,
        [
          "are_there_any_areas_you_feel_particularly_strong",
          "are_there_any_areas_you_feel_particularly_strong_in",
          "are_there_any_areas_you_feel_particularly_s..."
        ],
        ""
      );

      const connections = pickFirst(
        others,
        [
          "do_you_have_any_connections_that_you_feel_would_be_beneficial_to_waow_and_our_goal_of_promoting_and_supporting_women_artists_if_so_who_why",
          "do_you_have_any_connections_that_you_feel_would_be_beneficial_to_waow",
          "do_you_have_any_connections_that_you_fe..."
        ],
        ""
      );

      const growthAreas = pickFirst(
        others,
        [
          "in_what_areas_of_your_art_business_or_artwork_do_you_struggle",
          "in_what_areas_of_your_art_business_or_artwork",
          "in_what_areas_of_your_art_business_or_artw..."
        ],
        ""
      );

      submissionByEmail[email] = {
        firstName,
        lastName,
        name: fullName,
        email,
        medium: mediums,
        mediums,
        experience,
        experience_level: experience,
        statement,
        artist_statement_notes: statement,
        areas_particularly_strong: areasStrong,
        connections_felt: connections,
        areas_to_improve: growthAreas,
        facebook_or_instagram_page_link: socialLink,
        gallery
      };
    });

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
        mediums: enriched?.mediums || enriched?.medium || "Medium not provided",
        experience: enriched?.experience || "Experience not provided",
        experience_level:
          enriched?.experience_level ||
          enriched?.experience ||
          "Experience not provided",
        statement: enriched?.statement || "No artist statement provided.",
        artist_statement_notes:
          enriched?.artist_statement_notes ||
          enriched?.statement ||
          "No artist statement provided.",
        areas_particularly_strong: enriched?.areas_particularly_strong || "",
        connections_felt: enriched?.connections_felt || "",
        areas_to_improve: enriched?.areas_to_improve || "",
        facebook_or_instagram_page_link:
          enriched?.facebook_or_instagram_page_link || "",
        gallery: enriched?.gallery || "#",
        image: "https://placehold.co/1200x800/f1eadf/6b5e52?text=Applicant+Preview"
      };
    });

    return res.status(200).json(applicants);
  } catch (error) {
    console.error("jury-applicants error:", error);
    return res.status(500).json({
      error: "Failed to fetch applicants",
      detail: error.message
    });
  }
}
