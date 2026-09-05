# Pigpic V19 — Production Security

## Deploy
1. **Worker `pigpic-api`**: deploy `worker.js` and keep R2 binding `BUCKET -> pigpic`.
2. **Pages `pigpic`**: upload `index.html`, `app.js`, `auth.js`, `styles.css`.
3. Supabase: existing migrations remain valid; no new SQL is required for this security patch.

## Production hardening included
- CORS allowlist: `https://pigpic.pages.dev` plus local development origins.
- Unknown browser origins are rejected.
- Upload accepts only JPG / PNG / WebP.
- Upload size limit remains 10 MB.
- Empty uploads are rejected.
- API responses include basic security headers (`nosniff`, `no-referrer`, restrictive permissions policy).
- Authenticated R2 cleanup still verifies object `user_id` metadata before deletion.
- Post deletion still verifies post ownership through Supabase.

## Cloudflare dashboard — rate limiting
Worker-side code cannot provide a reliable global rate limit by itself. Configure Cloudflare rate limiting rules for the `pigpic-api` hostname:

Suggested starting limits:
- `POST /upload`: 10 requests / 10 minutes / IP.
- `POST /post` or equivalent write endpoints: 30 requests / 10 minutes / IP.
- `DELETE /upload` and `DELETE /post`: 30 requests / 10 minutes / IP.
- Keep `GET /image` out of aggressive rate limiting because feed image traffic is normal high-volume traffic.

When Pigpic gets real traffic, tighten limits by route and add Turnstile to signup/login/upload if bots become noticeable.

## Next production tasks
1. Deploy this V19 Worker.
2. Deploy the four Pages source files.
3. Add Cloudflare rate-limit rules.
4. Test signup, login, upload, profile save, delete post, and logout/login persistence.
5. Add custom domain before public launch.
