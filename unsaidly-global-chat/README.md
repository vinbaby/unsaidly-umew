# Unsaidly Global Chat — Premium chat MVP

A single global anonymous chat room. No account, profile, AI, DMs, or room creation.

## Included
- Minimal premium dark UI (Manrope + DM Sans, warm bronze accent)
- One global realtime room powered by Supabase Realtime
- Random anonymous browser ID / nickname
- Send message, presence count, message translation action
- Translation provider is optional and configurable (LibreTranslate/self-hosted)
- Report-message flow
- Ad placeholders: 728x90 desktop top/bottom and 320x50 mobile
- Responsive desktop/mobile layout

## Setup
1. Create/use a Supabase project.
2. Run `supabase-schema.sql` in Supabase SQL Editor.
3. Open `config.js`; set Supabase project URL and public anon/publishable key.
4. Optional translation: configure a LibreTranslate endpoint in `config.js`. For global use, self-hosting is recommended. Translation requires a translation engine; there is no AI chatbot or AI model in this project.
5. Upload this folder to Cloudflare Pages or any static host.

## Ads
The ad placements are placeholders, not live ads. Add your approved AdSense / ad-network code after the site is reviewed and approved. Keep ads separate from the chat controls.

## Important before public launch
This starter is not production hardened. Anonymous public INSERT policies can be abused. Add Cloudflare Turnstile and server-side rate limiting/moderation (preferably Supabase Edge Function or Cloudflare Worker) before sending real traffic. Configure message retention, report review, and abuse handling. Anonymous does not mean the hosting provider cannot process network metadata.
