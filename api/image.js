// api/image.js
// Public image proxy. Streams GHL document files by documentId.

module.exports = async function handler(req, res) {
  const { id } = req.query;

  if (!id || typeof id !== "string" || !/^[A-Za-z0-9]+$/.test(id)) {
    return res.status(400).json({ ok: false, error: "Invalid id" });
  }

  const token =
    process.env.GHL_PRIVATE_TOKEN ||
    process.env.GHL_API_KEY ||
    process.env.GHL_PIT;
  const locationId = process.env.GHL_LOCATION_ID;

  if (!token || !locationId) {
    return res.status(500).json({ ok: false, error: "Server misconfigured" });
  }

  try {
    const upstream = await fetch(
      `https://services.leadconnectorhq.com/documents/download/${id}`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          Version: "2021-07-28",
        },
      }
    );

    if (!upstream.ok) {
      return res
        .status(upstream.status)
        .json({ ok: false, error: `Upstream ${upstream.status}` });
    }

    const contentType = upstream.headers.get("content-type") || "image/jpeg";
    const contentLength = upstream.headers.get("content-length");

    // Public caching — these images don't change once uploaded
    res.setHeader("Content-Type", contentType);
    if (contentLength) res.setHeader("Content-Length", contentLength);
    res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
    res.setHeader("Access-Control-Allow-Origin", "*");

    const arrayBuffer = await upstream.arrayBuffer();
    return res.status(200).send(Buffer.from(arrayBuffer));
  } catch (err) {
    console.error("image proxy error:", err);
    return res.status(500).json({ ok: false, error: err.message });
  }
};
