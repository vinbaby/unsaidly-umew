/**
 * Unsaidly Global Chat API — Cloudflare Worker
 *
 * Required Worker secrets:
 *   SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY (server-side ONLY; never expose in config.js)
 *   TURNSTILE_SECRET_KEY
 *
 * Worker vars:
 *   TURNSTILE_REQUIRED = "true"
 *   ALLOWED_ORIGIN = "https://unsaidly.net" (or your Pages preview domain)
 *
 * Routes:
 *   POST /api/message { anon_id, nickname, body, turnstile_token }
 *   POST /api/report  { message_id, reporter_anon_id, reason, turnstile_token }
 */
const json = (data, status = 200, origin = "*") => new Response(JSON.stringify(data), {
  status,
  headers: {
    "Content-Type": "application/json; charset=utf-8",
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Vary": "Origin",
    "Cache-Control": "no-store"
  }
});

export default {
  async fetch(request, env) {
    const requestOrigin = request.headers.get("Origin") || "";
    const allowed = env.ALLOWED_ORIGIN || "*";
    const origin = allowed === "*" || requestOrigin === allowed ? (allowed === "*" ? "*" : requestOrigin) : "";
    if (!origin) return json({ error: "Origin not allowed" }, 403, "null");
    if (request.method === "OPTIONS") return new Response(null, {
      status: 204,
      headers: {
        "Access-Control-Allow-Origin": origin,
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
        "Vary": "Origin"
      }
    });
    if (request.method !== "POST") return json({ error: "Method not allowed" }, 405, origin);

    const url = new URL(request.url);
    if (!["/api/message", "/api/report"].includes(url.pathname)) return json({ error: "Not found" }, 404, origin);
    if (!env.SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) return json({ error: "Server is not configured" }, 503, origin);

    let payload;
    try { payload = await request.json(); } catch { return json({ error: "Invalid JSON" }, 400, origin); }
    const token = String(payload.turnstile_token || "");
    if (env.TURNSTILE_REQUIRED === "true") {
      if (!env.TURNSTILE_SECRET_KEY || !token) return json({ error: "Please complete the security check." }, 400, origin);
      const verify = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          secret: env.TURNSTILE_SECRET_KEY,
          response: token,
          remoteip: request.headers.get("CF-Connecting-IP") || ""
        })
      });
      const result = await verify.json();
      if (!result.success) return json({ error: "Security check failed. Please retry." }, 403, origin);
    }

    const anonId = String(payload.anon_id || payload.reporter_anon_id || "");
    if (anonId.length < 8 || anonId.length > 80) return json({ error: "Invalid anonymous ID" }, 400, origin);

    const now = Date.now();
    const previous = rateMap.get(anonId) || [];
    const recent = previous.filter(ts => now - ts < 60_000);
    if (recent.length >= 20 || (recent.length && now - recent[recent.length - 1] < 1800)) {
      return json({ error: "You're sending too fast. Please wait a moment." }, 429, origin);
    }
    recent.push(now);
    rateMap.set(anonId, recent);

    const isReport = url.pathname === "/api/report";
    const table = isReport ? "global_chat_reports" : "global_chat_messages";
    const row = isReport
      ? { message_id: payload.message_id, reporter_anon_id: anonId, reason: String(payload.reason || "").trim().slice(0, 250) }
      : { anon_id: anonId, nickname: String(payload.nickname || "Anonymous").slice(0, 40), body: String(payload.body || "").trim().slice(0, 600) };

    if (isReport) {
      if (!row.message_id || !row.reason) return json({ error: "Report details are missing" }, 400, origin);
    } else if (!row.body || row.body.length > 600) return json({ error: "Message must be 1–600 characters" }, 400, origin);

    const result = await fetch(env.SUPABASE_URL.replace(/\/$/, "") + "/rest/v1/" + table, {
      method: "POST",
      headers: {
        "apikey": env.SUPABASE_SERVICE_ROLE_KEY,
        "Authorization": "Bearer " + env.SUPABASE_SERVICE_ROLE_KEY,
        "Content-Type": "application/json",
        "Prefer": "return=minimal"
      },
      body: JSON.stringify(row)
    });
    if (!result.ok) {
      const details = await result.text();
      console.error("Supabase insert failed", result.status, details);
      return json({ error: "Could not save message. Please retry." }, 502, origin);
    }
    return json({ ok: true }, 200, origin);
  }
};

// Worker isolate-local best-effort limiter. Combine with Cloudflare rate limiting rules
// or Durable Objects for stronger cross-isolate limits.
const rateMap = new Map();
