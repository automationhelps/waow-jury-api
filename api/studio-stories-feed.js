// api/studio-stories-feed.js
const { isAuthenticated } = require("../lib/auth");

const GHL_BASE = "https://services.leadconnectorhq.com";
const GHL_VERSION = "2021-07-28";
const APPROVED_TAG = "studio-story-approved";

// Custom field IDs (from GHL — Form 10 fields)
const FIELD_STUDIO_STORY = "nmiOEUfGyrr9CbZ9w0Hf";
const FIELD_STUDIO_IMAGES = null; // TODO: fill in once we have the image-field ID

module.exports = async function handler(req, res) {
  if (!isAuthenticated(req)) {
    return res.status(401).json({ ok: false, error: "Not authenticated" });
  }

  try {
    const token =
      process.env.GHL_PRIVATE_TOKEN ||
      process.env.GHL_API_KEY ||
      process.env.GHL_PIT;
    const locationId = process.env.GHL_LOCATION_ID;

    if (!token || !locationId) {
      return res
        .status(500)
        .json({ ok: false, error: "Missing GHL credentials." });
    }

    const contacts = await fetchApprovedContacts({ token, locationId });
    const stories = contacts
      .map(buildStory)
      .filter((s) => s.studioStory && s.firstName);

    stories.sort((a, b) =>
      (b.submittedAt || "").localeCompare(a.submittedAt || "")
    );

    res.setHeader("Cache-Control", "private, no-store");
    return res.status(200).json({ ok: true, count: stories.length, stories });
  } catch (err) {
    console.error("studio-stories-feed error:", err);
    return res
      .status(500)
      .json({ ok: false, error: err.message || "Unknown error" });
  }
};

async function fetchApprovedContacts({ token, locationId }) {
  const all = [];
  let page = 1;
  const pageLimit = 100;

  while (true) {
    const body = {
      locationId,
      page,
      pageLimit,
      filters: [
        {
          group: "AND",
          filters: [
            { field: "tags", operator: "contains", value: APPROVED_TAG }
          ]
        }
      ]
    };

    const resp = await fetch(`${GHL_BASE}/contacts/search`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        Version: GHL_VERSION,
        "Content-Type": "application/json",
        Accept: "application/json"
      },
      body: JSON.stringify(body)
    });

    if (!resp.ok) {
      const text = await resp.text();
      throw new Error(
        `GHL search failed (${resp.status}): ${text.slice(0, 300)}`
      );
    }

    const data = await resp.json();
    const batch = data.contacts || [];
    all.push(...batch);
    if (batch.length < pageLimit) break;
    page += 1;
    if (page > 20) break;
  }

  return all;
}

function buildStory(contact) {
  const cf = customFieldsById(contact);

  const firstName = (contact.firstName || "").trim();
  const lastName = (contact.lastName || "").trim();
  const fullName = [firstName, lastName].filter(Boolean).join(" ");
  const email = (contact.email || "").trim();
  const website = normalizeUrl(contact.website || "");

  const studioStory = (cf[FIELD_STUDIO_STORY] || "").toString().trim();
  const images = FIELD_STUDIO_IMAGES
    ? parseImageField(cf[FIELD_STUDIO_IMAGES])
    : [];
  const firstImage = images[0] || "";

  const story = {
    contactId: contact.id,
    firstName,
    lastName,
    fullName,
    email,
    website,
    studioStory,
    images,
    firstImage,
    submittedAt: contact.dateAdded || contact.createdAt || ""
  };

  story.squarespaceHtml = renderSquarespaceBlock(story);
  return story;
}

function customFieldsById(contact) {
  const out = {};
  const arr = contact.customFields || contact.customField || [];
  if (Array.isArray(arr)) {
    for (const f of arr) {
      if (f && f.id !== undefined) out[f.id] = f.value;
    }
  }
  return out;
}

function parseImageField(raw) {
  if (!raw) return [];
  if (Array.isArray(raw))
    return raw.map(String).map((s) => s.trim()).filter(Boolean);
  const s = String(raw).trim();
  if (!s) return [];
  if (s.startsWith("[")) {
    try {
      const arr = JSON.parse(s);
      if (Array.isArray(arr))
        return arr.map(String).map((x) => x.trim()).filter(Boolean);
    } catch (_) {}
  }
  return s
    .split(/[\n,]+/)
    .map((x) => x.trim())
    .filter((x) => /^https?:\/\//i.test(x));
}

function normalizeUrl(u) {
  if (!u) return "";
  const t = String(u).trim();
  if (!t) return "";
  return /^https?:\/\//i.test(t) ? t : `https://${t}`;
}

function escapeHtml(s) {
  return String(s ?? "")
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}

function paragraphs(text) {
  return escapeHtml(text)
    .split(/\n\s*\n/)
    .map((p) => p.replace(/\n/g, "<br />"))
    .map((p) => `<p style="margin:0 0 1em;">${p}</p>`)
    .join("");
}

function displayHost(url) {
  try { return new URL(url).host.replace(/^www\./, ""); } catch { return url; }
}

function renderSquarespaceBlock(s) {
  const safeName = escapeHtml(s.fullName || "Studio Story");
  const safeStory = paragraphs(s.studioStory || "");
  const websiteHtml = s.website
    ? `<a href="${escapeHtml(s.website)}" target="_blank" rel="noopener noreferrer" style="color:#1f6d68;text-decoration:none;border-bottom:1px solid rgba(31,109,104,.35);">${escapeHtml(displayHost(s.website))}</a>`
    : "";
  const emailHtml = s.email
    ? `<a href="mailto:${escapeHtml(s.email)}" style="color:#1f6d68;text-decoration:none;border-bottom:1px solid rgba(31,109,104,.35);">${escapeHtml(s.email)}</a>`
    : "";
  const metaParts = [websiteHtml, emailHtml].filter(Boolean).join(' <span aria-hidden="true" style="color:#a2998f;">·</span> ');
  const imageHtml = s.firstImage
    ? `<img src="${escapeHtml(s.firstImage)}" alt="${safeName} studio image" style="width:100%;height:auto;display:block;border-radius:14px;box-shadow:0 10px 30px rgba(34,25,18,.08);margin:0 0 1.75em;" />`
    : "";

  return `<!-- Studio Story: ${safeName} -->
<div class="waow-studio-story" style="font-family:'Manrope',Arial,sans-serif;color:#2f261f;line-height:1.7;max-width:760px;margin:0 auto;padding:1.5em 0;">
  <link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@600;700&family=Manrope:wght@400;500;700&display=swap" rel="stylesheet" />
  ${imageHtml}
  <h2 style="font-family:'Cormorant Garamond',Georgia,serif;font-size:clamp(2rem,1.2rem + 2.5vw,3rem);line-height:1.05;margin:0 0 .25em;color:#2f261f;">${safeName}</h2>
  ${metaParts ? `<p style="margin:0 0 1.5em;color:#71675f;font-size:.95rem;">${metaParts}</p>` : ""}
  <div class="waow-studio-story__body" style="font-size:1.05rem;">
    ${safeStory}
  </div>
</div>`;
}
