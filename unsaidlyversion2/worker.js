const SUPABASE_URL = "https://vexgmymcvyovwltilisk.supabase.co";
// Publishable key is safe for public client use, but keep the Worker copy in a secret/var.
const SUPABASE_KEY = "sb_publishable_-L7UBemzT7FpVrUR12FogA_ASS2LKXC";

const ALLOWED_ORIGINS = new Set([
  "https://pigpic.pages.dev",
  "http://localhost:3000",
  "http://127.0.0.1:3000"
]);

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const requestOrigin = request.headers.get("Origin") || "";
    const origin = ALLOWED_ORIGINS.has(requestOrigin) ? requestOrigin : "";
    const cors = {
      "Access-Control-Allow-Origin": origin,
      "Vary": "Origin",
      "Access-Control-Allow-Methods": "GET, POST, DELETE, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
      "Access-Control-Max-Age": "86400"
    };
    if (request.method === "OPTIONS") {
      if (!origin) return json({ok:false,error:"Origin not allowed"}, 403);
      return new Response(null, { headers: cors });
    }
    if (requestOrigin && !origin) return json({ok:false,error:"Origin not allowed"}, 403, cors);

    if (request.method === "GET" && url.pathname === "/") {
      return json({ ok: true, service: "pigpic-api", r2: "connected", version: "v19" }, 200, cors);
    }

    if ((request.method === "GET" || request.method === "HEAD") && url.pathname === "/image") {
      const key = url.searchParams.get("key");
      if (!key || key.includes("..") || key.startsWith("/") || !key.startsWith("uploads/")) {
        return json({ ok:false, error:"Invalid key" }, 400, cors);
      }
      const cache = caches.default;
      const cacheKey = new Request(url.toString(), { method: "GET" });
      if (request.method === "GET") {
        const hit = await cache.match(cacheKey);
        if (hit) {
          const h = new Headers(hit.headers); h.set("X-Pigpic-Cache", "HIT");
          return new Response(hit.body, { status: hit.status, headers: h });
        }
      }
      const object = await env.BUCKET.get(key);
      if (!object) return json({ok:false,error:"Image not found"},404,cors);
      const headers = new Headers(cors);
      object.writeHttpMetadata(headers);
      headers.set("etag", object.httpEtag);
      headers.set("Cache-Control", "public, max-age=31536000, immutable");
      headers.set("X-Content-Type-Options", "nosniff");
      headers.set("X-Pigpic-Cache", "MISS");
      const response = new Response(request.method === "HEAD" ? null : object.body, { headers });
      if (request.method === "GET") await cache.put(cacheKey, response.clone());
      return response;
    }

    if (request.method === "POST" && url.pathname === "/upload") {
      const user = await authUser(request);
      if (!user) return json({ok:false,error:"Authentication required"},401,cors);
      const contentType = request.headers.get("content-type") || "";
      if (!["image/jpeg","image/png","image/webp"].includes(contentType)) return json({ok:false,error:"Only JPG, PNG or WebP are allowed"},400,cors);
      const length = Number(request.headers.get("content-length") || 0);
      if (length > 10 * 1024 * 1024) return json({ok:false,error:"Image too large"},413,cors);
      if (length === 0) return json({ok:false,error:"Empty upload"},400,cors);
      const id = crypto.randomUUID() + "-" + Date.now();
      const ext = (contentType.split("/")[1] || "bin").replace(/[^a-z0-9]/gi, "");
      const key = `uploads/${id}.${ext}`;
      await env.BUCKET.put(key, request.body, { httpMetadata: { contentType }, customMetadata: { user_id: user.id } });
      return json({ok:true,key,user_id:user.id},200,cors);
    }

    if (request.method === "DELETE" && url.pathname === "/upload") {
      const user = await authUser(request);
      if (!user) return json({ok:false,error:"Authentication required"},401,cors);
      const key = url.searchParams.get("key");
      if (!key || key.includes("..") || key.startsWith("/") || !key.startsWith("uploads/")) {
        return json({ok:false,error:"Invalid key"},400,cors);
      }
      const object = await env.BUCKET.head(key);
      if (!object) return json({ok:true,deleted:0},200,cors);
      if (object.customMetadata?.user_id !== user.id) return json({ok:false,error:"Not allowed"},403,cors);
      await env.BUCKET.delete(key);
      return json({ok:true,deleted:1},200,cors);
    }

    if (request.method === "DELETE" && url.pathname === "/post") {
      const user = await authUser(request);
      if (!user) return json({ok:false,error:"Authentication required"},401,cors);
      const postId = url.searchParams.get("post_id");
      if (!postId) return json({ok:false,error:"post_id is required"},400,cors);
      const post = await supabaseGetPost(postId, request);
      if (!post || post.user_id !== user.id) return json({ok:false,error:"Not allowed"},403,cors);
      const keys = [post.image_key, post.thumb_key].filter(Boolean);
      for (const key of keys) {
        if (typeof key === "string" && key.startsWith("uploads/") && !key.includes("..")) await env.BUCKET.delete(key);
      }
      return json({ok:true,deleted:keys.length},200,cors);
    }

    return json({ok:false,error:"Not found"},404,cors);
  }
};

async function authUser(request) {
  const token = request.headers.get("Authorization") || "";
  if (!token.startsWith("Bearer ")) return null;
  try {
    const r = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
      headers: { apikey: SUPABASE_KEY, Authorization: token }
    });
    if (!r.ok) return null;
    return await r.json();
  } catch { return null; }
}

async function supabaseGetPost(postId, request) {
  const token = request.headers.get("Authorization") || "";
  const u = new URL(`${SUPABASE_URL}/rest/v1/posts`);
  u.searchParams.set("select", "id,user_id,image_key,thumb_key,status");
  u.searchParams.set("id", `eq.${postId}`);
  u.searchParams.set("limit", "1");
  try {
    const r = await fetch(u, { headers: { apikey: SUPABASE_KEY, Authorization: token } });
    if (!r.ok) return null;
    const rows = await r.json();
    return rows?.[0] || null;
  } catch { return null; }
}

function json(data,status=200,extra={}) {
  const headers = new Headers(extra);
  headers.set("Content-Type","application/json; charset=utf-8");
  headers.set("X-Content-Type-Options","nosniff");
  headers.set("Referrer-Policy","no-referrer");
  headers.set("Permissions-Policy","camera=(), microphone=(), geolocation=()");
  return new Response(JSON.stringify(data),{status,headers});
}
