// lib/auth.js
const crypto = require("crypto");

const COOKIE_NAME = "waow_session";
const SESSION_DAYS = 7;

function sign(value, secret) {
  return crypto.createHmac("sha256", secret).update(value).digest("hex");
}

function createSessionCookie() {
  const secret = process.env.AUTH_SECRET;
  if (!secret) throw new Error("AUTH_SECRET not set");
  const issuedAt = Date.now();
  const expires = issuedAt + SESSION_DAYS * 24 * 60 * 60 * 1000;
  const payload = `${issuedAt}.${expires}`;
  const sig = sign(payload, secret);
  const value = `${payload}.${sig}`;
  const maxAge = SESSION_DAYS * 24 * 60 * 60;
  return `${COOKIE_NAME}=${value}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${maxAge}`;
}

function clearCookie() {
  return `${COOKIE_NAME}=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0`;
}

function parseCookies(header = "") {
  const out = {};
  header.split(";").forEach((p) => {
    const idx = p.indexOf("=");
    if (idx === -1) return;
    const k = p.slice(0, idx).trim();
    const v = p.slice(idx + 1).trim();
    if (k) out[k] = decodeURIComponent(v);
  });
  return out;
}

function isAuthenticated(req) {
  const secret = process.env.AUTH_SECRET;
  if (!secret) return false;
  const cookies = parseCookies(req.headers.cookie || "");
  const raw = cookies[COOKIE_NAME];
  if (!raw) return false;
  const parts = raw.split(".");
  if (parts.length !== 3) return false;
  const [issuedAt, expires, sig] = parts;
  const expected = sign(`${issuedAt}.${expires}`, secret);
  if (
    sig.length !== expected.length ||
    !crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))
  ) {
    return false;
  }
  if (Date.now() > Number(expires)) return false;
  return true;
}

module.exports = {
  createSessionCookie,
  clearCookie,
  isAuthenticated,
  COOKIE_NAME,
};
