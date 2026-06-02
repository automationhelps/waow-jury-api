// api/login.js
const { createSessionCookie } = require("../lib/auth");

module.exports = async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ ok: false, error: "Method not allowed" });
  }

  const expected = process.env.ADMIN_PASSWORD;
  if (!expected) {
    return res.status(500).json({ ok: false, error: "Server not configured" });
  }

  let body = req.body;
  if (typeof body === "string") {
    try { body = JSON.parse(body); } catch { body = {}; }
  }
  body = body || {};

  if (typeof body.password !== "string" || body.password !== expected) {
    // small delay to slow brute force
    await new Promise((r) => setTimeout(r, 400));
    return res.status(401).json({ ok: false, error: "Incorrect password" });
  }

  res.setHeader("Set-Cookie", createSessionCookie());
  return res.status(200).json({ ok: true });
};
