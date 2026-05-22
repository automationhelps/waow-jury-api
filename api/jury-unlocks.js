// api/jury-unlocks.js

let kvClient = null;
const memoryUnlocks = new Map();

async function getKV() {
  if (kvClient) return kvClient;

  try {
    const mod = await import("@vercel/kv");
    kvClient = mod.kv;
    return kvClient;
  } catch (error) {
    return null;
  }
}

module.exports = async function handler(req, res) {
  setCorsHeaders(req, res);

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  try {
    if (req.method === "GET") {
      const unlocks = await listUnlocks();
      return res.status(200).json(unlocks);
    }

    if (req.method === "POST") {
      const body = await parseBody(req);

      const jurorEmail = normalize(body.juror_email);
      const applicantEmail = normalize(body.applicant_email);
      const requestedBy = clean(body.requested_by || "jury-room");
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
        reason: reason,
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
      const suppliedLockKey = normalize(body.lock_key);
      const lockKey = suppliedLockKey || makeLockKey(jurorEmail, applicantEmail);

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

    return res.status(405).json({
      error: "Method not allowed"
    });
  } catch (error) {
    console.error("jury-unlocks error:", error);
    return res.status(500).json({
      error: "Failed to process jury unlocks",
      detail: error && error.message ? error.message : "Unknown error"
    });
  }
};

function setCorsHeaders(req, res) {
  const allowedOrigin = req.headers.origin || "*";

  res.setHeader("Access-Control-Allow-Origin", allowedOrigin);
  res.setHeader("Vary", "Origin");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, DELETE, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
}

async function listUnlocks() {
  const kv = await getKV();

  if (kv) {
    const index = (await kv.get("jury_unlock_keys")) || [];
    if (!Array.isArray(index) || !index.length) return [];

    const items = [];
    for (const lockKey of index) {
      const item = await kv.get(`jury_unlock:${lockKey}`);
      if (item && item.active !== false) {
        items.push(item);
      }
    }

    items.sort(function (a, b) {
      return parseDateValue(b.unlocked_at) - parseDateValue(a.unlocked_at);
    });

    return items;
  }

  return Array.from(memoryUnlocks.values())
    .filter(function (item) {
      return item && item.active !== false;
    })
    .sort(function (a, b) {
      return parseDateValue(b.unlocked_at) - parseDateValue(a.unlocked_at);
    });
}

async function saveUnlock(record) {
  const kv = await getKV();

  if (kv) {
    const kvKey = `jury_unlock:${record.lock_key}`;
    await kv.set(kvKey, record);

    const currentIndex = (await kv.get("jury_unlock_keys")) || [];
    const nextIndex = Array.from(
      new Set([...(Array.isArray(currentIndex) ? currentIndex : []), record.lock_key])
    );

    await kv.set("jury_unlock_keys", nextIndex);
    return;
  }

  memoryUnlocks.set(record.lock_key, record);
}

async function deleteUnlock(lockKey) {
  const kv = await getKV();

  if (kv) {
    const kvKey = `jury_unlock:${lockKey}`;
    const existing = await kv.get(kvKey);

    if (!existing) {
      return false;
    }

    await kv.del(kvKey);

    const currentIndex = (await kv.get("jury_unlock_keys")) || [];
    const nextIndex = (Array.isArray(currentIndex) ? currentIndex : []).filter(function (key) {
      return key !== lockKey;
    });

    await kv.set("jury_unlock_keys", nextIndex);
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
    } catch (error) {
      throw new Error("Invalid JSON body");
    }
  }

  return readJsonBody(req);
}

function readJsonBody(req) {
  return new Promise(function (resolve, reject) {
    let raw = "";

    req.on("data", function (chunk) {
      raw += chunk;
    });

    req.on("end", function () {
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

    req.on("error", function (error) {
      reject(error);
    });
  });
}

function makeLockKey(jurorEmail, applicantEmail) {
  const juror = normalize(jurorEmail);
  const applicant = normalize(applicantEmail);

  if (!juror || !applicant) return "";
  return juror + "::" + applicant;
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
