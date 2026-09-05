# UNSAIDLY V2 — UMEW LIVE EDITION

## What is included
- UMEW Pinterest-style UI
- Custom **Me Too** brand icon: two people hugging (not a heart)
- Anonymous browser UUID only; no account/login/email
- Shared online backend support via Supabase
- Real posts, replies, Me Too reactions, reports
- Two side-by-side ad slots in the feed
- Demo mode still works when Supabase is not configured

## Make it LIVE (important)
1. Open your Supabase project's **SQL Editor**.
2. Copy everything from `supabase-schema.sql` and run it once.
3. Open `config.js` and paste your own:
   - Supabase Project URL
   - Publishable/Anon key
4. Upload all files to GitHub/Cloudflare Pages.

When configured correctly, the yellow `DEMO MODE` notice becomes a green `LIVE` notice and posts are shared between browsers/devices.

## Privacy model
- No login
- No email
- No username
- IP is not used as the application's identity
- `unsaidly_anon_id` is generated randomly and stored in browser localStorage

## Security note
The current anonymous MVP uses public insert/select policies so anyone can post without an account. Before large-scale public launch, add Cloudflare Turnstile / rate limiting through an Edge Function or Worker for stronger spam protection.
