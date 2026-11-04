// Browser-safe config only. Never put Supabase service_role or Turnstile secret keys here.
window.UNSAIDLY_CHAT_CONFIG = {
  supabaseUrl: "PASTE_SUPABASE_URL",
  supabaseAnonKey: "PASTE_SUPABASE_PUBLISHABLE_OR_ANON_KEY",
  // Cloudflare Worker URL, e.g. https://unsaidly-chat-api.yourname.workers.dev
  workerUrl: "",
  // Cloudflare Turnstile PUBLIC site key (safe in browser); secret key belongs in Worker secrets.
  turnstileSiteKey: "",
  // LibreTranslate endpoint; leave empty until configured.
  translateUrl: "",
  // Only use a public/client-safe translation API key. Do not put provider secret keys here.
  translateApiKey: ""
};