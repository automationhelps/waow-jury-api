// api/jury-unlocks.js

let kv = null;
let memoryUnlocks = new Map();

async function getKV() {
  if (kv) return kv;

  try {
    const mod = await import("@vercel/kv");
    kv = mod.kv;
    return kv;
  } catch (error) {
    return null;
  }
}

module.exports = async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, DELETE, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  try {
    if (req.method === "GET") {
      const items = await listUnlocks();
      return res.status(200).json(items);
    }

    if (req.method === "POST") {
      const body = await parseBody(req);

      const jurorEmail = normalize(body.juror_email);
      const applicantEmail = normalize(body.applicant_email);
      const requestedBy = clean(body.requested_by || body.admin_name || "admin");
      const reason = clean(body.reason || "Manual unlock");

      if (!jurorEmail || !applicantEmail) {
        return res.status(400).json({
          error: "juror_email and applicant_email are required"
        });
      }

      const lockKey = makeLockKey(jurorEmail, applicantEmail);

      const record = {
        id: lockKey,
        lock_key: lockKey,
        juror_email: jurorEmail,
        applicant_email: applicantEmail,
        requested_by: requestedBy,
        reason,
        unlocked_at: new Date().toISOString(),
        active: true
      };

      await saveUnlock(record);

      return res.status(200).json({
        success: true,
        message: "Unlock saved",
        unlock: record
      });
    }

    if (req.method === "DELETE") {
      const body = await parseBody(req);

      const jurorEmail = normalize(body.juror_email);
      const applicantEmail = normalize(body.applicant_email);
      const lockKey =
        normalize(body.lock_key) ||
        makeLockKey(jurorEmail, applicantEmail);

      if (!lockKey) {
        return res.status(400).json({
          error: "lock_key or juror_email + applicant_email is required"
        });
      }

      const removed = await deleteUnlock(lockKey);

      return res.status(200).json({
        success: true,
        message: removed ? "Unlock removed" : "Unlock not found",
        lock_key: lockKey
      });
    }

    return res.status(405).json({ error: "Method not allowed" });
  } catch (error) {
    console.error("jury-unlocks error:", error);
    return res.status(500).json({
      error: "Failed to process jury unlocks",
      detail: error.message || "Unknown error"
    });
  }
};

async function listUnlocks() {
  const store = await getKV();

  if (store) {
    const index = (await store.get("jury_unlock_keys")) || [];
    if (!Array.isArray(index) || index.length === 0) return [];

    const results = [];
    for (const key of index) {
      const item = await store.get(`jury_unlock:${key}`);
      if (item && item.active !== false) {
        results.push(item);
      }
    }

    results.sort((a, b) => parseDateValue(b.unlocked_at) - parseDateValue(a.unlocked_at));
    return results;
  }

  return Array.from(memoryUnlocks.values())
    .filter((item) => item && item.active !== false)
    .sort((a, b) => parseDateValue(b.unlocked_at) - parseDateValue(a.unlocked_at));
}

async function saveUnlock(record) {
  const store = await getKV();

  if (store) {
    const kvKey = `jury_unlock:${record.lock_key}`;
    await store.set(kvKey, record);

    const existingIndex = (await store.get("jury_unlock_keys")) || [];
    const nextIndex = Array.from(new Set([...(Array.isArray(existingIndex) ? existingIndex : []), record.lock_key]));
    await store.set("jury_unlock_keys", nextIndex);
    return;
  }

  memoryUnlocks.set(record.lock_key, record);
}

async function deleteUnlock(lockKey) {
  const store = await getKV();

  if (store) {
    const kvKey = `jury_unlock:${lockKey}`;
    const existing = await store.get(kvKey);

    if (!existing) return false;

    await store.del(kvKey);

    const existingIndex = (await store.get("jury_unlock_keys")) || [];
    const nextIndex = (Array.isArray(existingIndex) ? existingIndex : []).filter((key) => key !== lockKey);
    await store.set("jury_unlock_keys", nextIndex);

    return true;
  }

  return memoryUnlocks.delete(lockKey);
}

async function parseBody(req) {
  if (req.body && typeof req.body === "object") {
    return req.body;
  }

  if (typeof req.body === "string" && req.body.trim()) {
    try {
      return JSON.parse(req.body);
    } catch {
      throw new Error("Invalid JSON body");
    }
  }

  return await readJsonBody(req);
}

async function readJsonBody(req) {
  return await new Promise((resolve, reject) => {
    let raw = "";

    req.on("data", (chunk) => {
      raw += chunk;
    });

    req.on("end", () => {
      if (!raw.trim()) {
        resolve({});
        return;
      }

      try {
        resolve(JSON.parse(raw));
      } catch (error) {
        reject(new Error("Invalid JSON body"));
      }
    });

    req.on("error", (error) => {
      reject(error);
    });
  });
}

function makeLockKey(jurorEmail, applicantEmail) {
  const juror = normalize(jurorEmail);
  const applicant = normalize(applicantEmail);
  if (!juror || !applicant) return "";
  return `${juror}::${applicant}`;
}

function normalize(value) {
  return String(value || "").trim().toLowerCase();
}

function clean(value) {
  return String(value || "").trim();
}

function parseDateValue(value) {
  const time = new Date(value || 0).getTime();
  return Number.isFinite(time) ? time : 0;
}
