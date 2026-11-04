// Browser-safe config only. Never put Supabase service_role or secret keys here.
window.UNSAIDLY_CHAT_CONFIG = {
  supabaseUrl: "https://tdrohnjfyhngzopjccrx.supabase.co",
  supabaseAnonKey: "sb_publishable_lOhwWvuxpxqt2W_sBDi01g_RxflW6Ih",
  // Supabase Edge Function API (message/report routes appended by app.js).
  workerUrl: "https://tdrohnjfyhngzopjccrx.supabase.co/functions/v1/unsaidly-chat",
  // Cloudflare Turnstile PUBLIC test key; replace with production site key later.
  turnstileSiteKey: "1x00000000000000000000AA",
  // LibreTranslate endpoint; leave empty for built-in MyMemory translation.
  translateUrl: "",
  // Only use a public/client-safe translation API key.
  translateApiKey: ""
};