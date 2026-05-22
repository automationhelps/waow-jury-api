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
  const DEBUG_MODE = true;

  const ghlHeaders = {
    Authorization: `Bearer ${GHL_TOKEN}`,
    Version: "2021-07-28",
    "Content-Type": "application/json"
  };

  const safeString = (value) => String(value ?? "").trim();

  const normalizeUrl = (url) => {
    const clean = safeString(url);
    if (!clean) return "";
    if (/^https?:\/\//i.test(clean)) return clean;
    return `https://${clean}`;
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

  const flattenCustomFieldValue = (value) => {
    if (Array.isArray(value)) {
      return value.map((v) => safeString(v)).filter(Boolean).join(", ");
    }
    if (value && typeof value === "object") {
      if (Array.isArray(value.value)) {
        return value.value.map((v) => safeString(v)).filter(Boolean).join(", ");
      }
      if ("value" in value) return safeString(value.value);
    }
    return safeString(value);
  };

  const getContactFieldArray = (contact) => {
    if (Array.isArray(contact.customFields)) return contact.customFields;
    if (Array.isArray(contact.customFieldsData)) return contact.customFieldsData;
    if (Array.isArray(contact.custom_fields)) return contact.custom_fields;
    if (Array.isArray(contact.customField)) return contact.customField;
    return [];
  };

  const findCustomFieldValue = (contact, possibleKeys = []) => {
    const fields = getContactFieldArray(contact);

    for (const field of fields) {
      const id = safeString(field.id);
      const key = safeString(field.key);
      const fieldKey = safeString(field.fieldKey);
      const name = safeString(field.name);

      const matched = possibleKeys.some((candidate) => {
        const c = safeString(candidate);
        return c && (c === id || c === key || c === fieldKey || c === name);
      });

      if (matched) {
        const value =
          flattenCustomFieldValue(field.value) ||
          flattenCustomFieldValue(field.fieldValue);
        if (value) return value;
      }
    }

    return "";
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
        pickFirst(others, ["facebook_or_instagram_page_link", "r6gpxefXNTk3iCtE5iA3"], "")
      );

      const website = normalizeUrl(rawWebsite);
      const gallery = website || socialLink || "#";

      const experience = pickFirst(
        others,
        ["experience_level", "VWVo0DMHHKn1gEzy7plr"],
        "Experience not provided"
      );

      const mediums = pickFirst(
        others,
        ["mediums", "gID7o6vKL4nC15Ted4b5", "MwjoxLsrbupQoS2lv9WN"],
        "Medium not provided"
      );

      const statement = pickFirst(
        others,
        ["artist_statement_notes", "JPmbfbljoUVBN6Idok6Q", "drOsXj2ScM7Y9i1j14sk"],
        "No artist statement provided."
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
        facebook_or_instagram_page_link: socialLink,
        gallery
      };
    });

    const detailedContacts = await Promise.all(
      taggedContacts.map(async (contact) => {
        const contactId = contact.id || contact._id;
        if (!contactId) return contact;

        try {
          const detailResponse = await fetch(`${API_BASE}/contacts/${contactId}`, {
            method: "GET",
            headers: {
              Authorization: `Bearer ${GHL_TOKEN}`,
              Version: "2021-07-28"
            }
          });

          if (!detailResponse.ok) return contact;

          const detailData = await detailResponse.json();
          return detailData.contact || detailData || contact;
        } catch (err) {
          return contact;
        }
      })
    );

    const applicants = detailedContacts.map((contact) => {
      const email = safeString(contact.email).toLowerCase();
      const enriched = submissionByEmail[email] || null;

      const firstName = enriched?.firstName || safeString(contact.firstName);
      const lastName = enriched?.lastName || safeString(contact.lastName);
      const fullName =
        enriched?.name ||
        safeString(contact.name) ||
        `${firstName} ${lastName}`.trim();

      const contactAreasStrong = findCustomFieldValue(contact, [
        "contact.are_there_any_areas_you_feel_particularly_strong",
        "are_there_any_areas_you_feel_particularly_strong"
      ]);

      const contactConnections = findCustomFieldValue(contact, [
        "contact.do_you_have_any_connections_that_you_feel_would_be_beneficial_to_waow_and_our_goal_of_promoting_and_supporting_women_artists_if_so_who_why",
        "do_you_have_any_connections_that_you_feel_would_be_beneficial_to_waow_and_our_goal_of_promoting_and_supporting_women_artists_if_so_who_why"
      ]);

      const contactGrowthAreas = findCustomFieldValue(contact, [
        "contact.in_what_areas_of_your_art_business_or_artwork_do_you_struggle",
        "in_what_areas_of_your_art_business_or_artwork_do_you_struggle"
      ]);

      const contactStatement = findCustomFieldValue(contact, [
        "contact.artist_statement_notes",
        "artist_statement_notes",
        "JPmbfbljoUVBN6Idok6Q"
      ]);

      const contactExperience = findCustomFieldValue(contact, [
        "contact.experience_level",
        "experience_level",
        "VWVo0DMHHKn1gEzy7plr"
      ]);

      const contactMediums = findCustomFieldValue(contact, [
        "contact.mediums",
        "mediums",
        "gID7o6vKL4nC15Ted4b5",
        "MwjoxLsrbupQoS2lv9WN"
      ]);

      const contactSocial = normalizeUrl(
        findCustomFieldValue(contact, [
          "contact.facebook_or_instagram_page_link",
          "facebook_or_instagram_page_link",
          "r6gpxefXNTk3iCtE5iA3"
        ])
      );

      const finalMediums = enriched?.mediums || contactMediums || "Medium not provided";
      const finalExperience = enriched?.experience_level || contactExperience || "Experience not provided";
      const finalStatement = enriched?.artist_statement_notes || contactStatement || "No artist statement provided.";
      const finalSocial = enriched?.facebook_or_instagram_page_link || contactSocial || "";

      const debugFields = getContactFieldArray(contact).map((field) => ({
        id: safeString(field.id),
        key: safeString(field.key),
        fieldKey: safeString(field.fieldKey),
        name: safeString(field.name),
        value: flattenCustomFieldValue(field.value || field.fieldValue || "")
      }));

      const result = {
        id: contact.id || email || fullName,
        firstName,
        lastName,
        name: fullName,
        email: email || safeString(contact.email),
        medium: finalMediums,
        mediums: finalMediums,
        experience: finalExperience,
        experience_level: finalExperience,
        statement: finalStatement,
        artist_statement_notes: finalStatement,
        areas_particularly_strong: contactAreasStrong || "",
        connections_felt: contactConnections || "",
        areas_to_improve: contactGrowthAreas || "",
        facebook_or_instagram_page_link: finalSocial,
        gallery: enriched?.gallery || finalSocial || "#",
        image: "https://placehold.co/1200x800/f1eadf/6b5e52?text=Applicant+Preview"
      };

      if (DEBUG_MODE) {
        result.debug_version = "jury-api-debug-2026-05-22-855pm";
        result.debug_contact_id = safeString(contact.id || contact._id);
        result.debug_contact_name = fullName;
        result.debug_custom_fields = debugFields;
      }

      return result;
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
</query>
