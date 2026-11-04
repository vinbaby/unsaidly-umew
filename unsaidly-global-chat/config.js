// Browser-safe config only. Never put Supabase service_role or Turnstile secret keys here.
window.UNSAIDLY_CHAT_CONFIG = {
  supabaseUrl: "https://tdrohnjfyhngzopjccrx.supabase.co",
  supabaseAnonKey: "sb_publishable_lOhwWvuxpxqt2W_sBDi01g_RxflW6Ih",
  // Cloudflare Worker URL, e.g. https://unsaidly-chat-api.yourname.workers.dev
  workerUrl: "",
  // Cloudflare Turnstile PUBLIC site key (safe in browser); secret key belongs in Worker secrets.
  turnstileSiteKey: "1x00000000000000000000AA", // Cloudflare test sitekey; replace before production
  // LibreTranslate endpoint; leave empty until configured.
  translateUrl: "",
  // Only use a public/client-safe translation API key. Do not put provider secret keys here.
  translateApiKey: ""
};