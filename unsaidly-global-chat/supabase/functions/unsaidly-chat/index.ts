import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Content-Type, apikey, Authorization",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Content-Type": "application/json; charset=utf-8",
  "Cache-Control": "no-store",
};
const json = (data: unknown, status=200) => new Response(JSON.stringify(data),{status,headers:cors});
const rateMap = new Map<string,number[]>();

Deno.serve(async (req: Request) => {
  if (req.method==="OPTIONS") return new Response(null,{status:204,headers:cors});
  if (req.method!=="POST") return json({error:"Method not allowed"},405);
  const url = new URL(req.url);
  const isReport = url.pathname.endsWith("/report") || url.pathname.endsWith("/api/report");
  const isMessage = url.pathname.endsWith("/message") || url.pathname.endsWith("/api/message");
  if (!isMessage && !isReport) return json({error:"Not found"},404);

  let p: Record<string,unknown>;
  try { p=await req.json(); } catch { return json({error:"Invalid JSON"},400); }
  const anonId=String(p.anon_id || p.reporter_anon_id || "");
  if (anonId.length<8 || anonId.length>80) return json({error:"Invalid anonymous ID"},400);

  // Optional server-side Turnstile validation. Configure TURNSTILE_SECRET_KEY in
  // Supabase Edge Function secrets to enable it. Do not use test keys in production.
  const turnstileSecret=Deno.env.get("TURNSTILE_SECRET_KEY");
  if (turnstileSecret) {
    const token=String(p.turnstile_token || "");
    if (!token) return json({error:"Please complete the security check."},400);
    const verify=await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify",{
      method:"POST",headers:{"Content-Type":"application/x-www-form-urlencoded"},
      body:new URLSearchParams({secret:turnstileSecret,response:token})
    });
    const result=await verify.json();
    if (!result.success) return json({error:"Security check failed. Please retry."},403);
  }

  const now=Date.now(), old=rateMap.get(anonId)||[];
  const recent=old.filter(t=>now-t<60000);
  if (recent.length>=20 || (recent.length>0 && now-recent[recent.length-1]<2100)) {
    return json({error:"You're sending too fast. Please wait a moment."},429);
  }
  recent.push(now); rateMap.set(anonId,recent);

  const secretKeys=JSON.parse(Deno.env.get("SUPABASE_SECRET_KEYS")||"{}");
  const key=secretKeys.default || Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const projectUrl=Deno.env.get("SUPABASE_URL");
  if (!key || !projectUrl) return json({error:"Backend credentials unavailable"},503);

  const table=isReport?"global_chat_reports":"global_chat_messages";
  const row=isReport
    ? {message_id:String(p.message_id||""),reporter_anon_id:anonId,reason:String(p.reason||"").trim().slice(0,250)}
    : {anon_id:anonId,nickname:String(p.nickname||"Anonymous").slice(0,40),body:String(p.body||"").trim().slice(0,600)};
  if (isReport && (!row.message_id || !row.reason)) return json({error:"Report details are missing"},400);
  if (isMessage && (!row.body || row.body.length>600)) return json({error:"Message must be 1–600 characters"},400);

  const result=await fetch(projectUrl.replace(/\/$/,"")+"/rest/v1/"+table,{
    method:"POST",
    headers:{apikey:key,Authorization:"Bearer "+key,"Content-Type":"application/json",Prefer:"return=minimal"},
    body:JSON.stringify(row)
  });
  if (!result.ok) {
    console.error("Supabase write failed",result.status,await result.text());
    return json({error:"Could not save message. Please retry."},502);
  }
  return json({ok:true});
});