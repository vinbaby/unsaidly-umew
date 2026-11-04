# Unsaidly Global Chat

A single global anonymous room. No accounts, user profiles, DMs, or room creation.

## Included
- Responsive premium dark UI
- One global room using Supabase Realtime
- Anonymous browser nickname (not a verified identity)
- Messages, presence count, translation action, reports
- Cloudflare Worker write API + Turnstile verification
- Per-ID best-effort rate limit
- Ad slot placeholders (not live ads)

## 1. Supabase setup
1. Create/open a Supabase project.
2. Run `supabase-schema.sql` in the SQL Editor.
3. Copy the project URL and **publishable/anon key** into `config.js`.
4. Never put the Supabase `service_role` or secret key in frontend files.
5. Ensure Realtime is enabled for `global_chat_messages`.

The SQL disables direct browser INSERT permissions. Message/report writes are designed to go through the Worker.

## 2. Cloudflare Worker setup
1. Install Wrangler: `npm install -g wrangler`.
2. Log in: `wrangler login`.
3. From this folder, deploy: `wrangler deploy`.
4. Add the server secrets (Wrangler will prompt for each value):
   - `wrangler secret put SUPABASE_URL`
   - `wrangler secret put SUPABASE_SERVICE_ROLE_KEY`
   - `wrangler secret put TURNSTILE_SECRET_KEY`
5. Set `ALLOWED_ORIGIN` in `wrangler.toml` to your Pages/domain origin(s). Comma-separated values are supported. For a quick staging test, `*` is allowed but restrict it before production.
6. Keep `TURNSTILE_REQUIRED = "true"`.

Worker API routes:
- `POST /api/message`
- `POST /api/report`

## 3. Turnstile
1. Create a Turnstile widget in Cloudflare.
2. Put its **sitekey** into `config.js` as `turnstileSiteKey`.
3. Put its **secret key** in Worker secret `TURNSTILE_SECRET_KEY` only.

For a safe integration smoke test, Cloudflare documents test credentials:
- Sitekey: `1x00000000000000000000AA`
- Secret: `1x0000000000000000000000000000000AA`

Use these only in testing; production must use your real Turnstile keys. See [Cloudflare Turnstile testing](https://developers.cloudflare.com/turnstile/troubleshooting/testing/).

## 4. Frontend config
Set in `config.js`:
- `supabaseUrl`
- `supabaseAnonKey` (public publishable/anon key)
- `workerUrl` (Worker base URL, no route suffix)
- `turnstileSiteKey`

Optional translation:
- `translateUrl`: LibreTranslate base URL
- `translateApiKey`: only a key intended to be used in a public browser. Provider secrets should be proxied server-side.

## 5. Deploy static site
Upload the contents of this folder to Cloudflare Pages (not the folder's parent). For a Git-connected Pages deployment, set this folder as the project root directory.

After deploy:
1. Open the public URL.
2. Confirm the page shows Connected.
3. Send a message from one browser.
4. Open the same page in another browser/incognito and confirm it appears live.
5. Test translation, report, presence count, mobile layout.

## Ads
The ad slots are placeholders. Replace them with your approved network code after ad-network approval. Never render ads as chat messages.

## Important security/production notes
- Anonymous means no account login; it does not hide IP/network metadata from Cloudflare/Supabase.
- Worker isolate-local throttling is best-effort. Configure Cloudflare rate limiting rules or Durable Objects for stronger limits.
- Keep the service role key in Worker secrets only.
- Public chat needs moderation, abuse-report review, message retention/deletion, and legal/privacy notices before broad promotion.
- Do not use Turnstile testing keys in production.
