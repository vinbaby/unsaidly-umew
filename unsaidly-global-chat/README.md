# Unsaidly Global Chat

Single global anonymous room. No accounts, profiles, DMs, or room creation.

## Stack
- GitHub: source code
- Supabase: database, Realtime, and Edge Function API
- Cloudflare: domain/DNS only
- Translation: MyMemory keyless endpoint when Translate is clicked
- Ads: UI placeholders; replace with approved ad network code before monetization

## Supabase setup
The project has:
- `global_chat_messages`
- `global_chat_reports`
- RLS and public SELECT for chat messages
- Writes restricted to the server-side Edge Function
- Realtime enabled for chat messages

Edge Function:
`https://tdrohnjfyhngzopjccrx.supabase.co/functions/v1/unsaidly-chat`

The frontend app appends:
- `/api/message`
- `/api/report`

The function uses Supabase's server-side secret key from its runtime environment. Never put service/secret keys in `config.js`.

## Frontend
`config.js` already points to the project and function URL. The Supabase publishable key is browser-safe when RLS is configured.

Upload the contents of `unsaidly-global-chat/` to the existing static hosting deployment, or configure the existing Git-connected static site with this folder as its root. Cloudflare DNS/domain settings do not need to change.

## Turnstile staging vs production
The UI currently uses Cloudflare's public test sitekey. Before public launch:
1. Create a real Turnstile widget for the actual site domain.
2. Replace `turnstileSiteKey` in `config.js` with the real public sitekey.
3. Add `TURNSTILE_SECRET_KEY` to Supabase Edge Function secrets (never frontend/GitHub).
4. Confirm server-side validation is active, then test the widget.

Until `TURNSTILE_SECRET_KEY` is configured in Supabase, server-side Turnstile verification is skipped. This is staging-only; do not launch broadly before enabling it.

## Ads
Ad spaces are placeholders only. Add real approved ad network snippets after approval. Do not post ads as chat messages.

## Safety/operations
- Anonymous chat is not invisible: IP/network metadata may be processed by hosting and database providers.
- Rate limit is best-effort per anonymous browser ID; it can be bypassed by changing IDs.
- Add stronger abuse controls, report moderation, message retention/deletion, and legal/privacy notices before broad public launch.
