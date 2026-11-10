# Deployment

The project has not been deployed. These are the steps to do it.

## 1. Database: switch to PostgreSQL

Local development uses SQLite because no PostgreSQL server was available while building. The schema only uses types both databases support.

1. Create a PostgreSQL database (Neon, Supabase, Vercel Postgres, Railway, or your own server).
2. In `prisma/schema.prisma` change `provider = "sqlite"` to `provider = "postgresql"`.
3. Delete `prisma/migrations/` (it holds SQLite SQL) and create a fresh baseline against the new database:
   ```bash
   DATABASE_URL="postgresql://..." npx prisma migrate dev --name init
   ```
   Commit the new `prisma/migrations/` folder.
4. On every deploy run `npm run db:deploy` (`prisma migrate deploy`), then `npm run db:seed` once for the first install.

Enquiry search uses case-insensitive matching on PostgreSQL automatically (`src/lib/enquiries.ts`).

## 2. Hosting (Vercel or any Node host)

- Build command: `npm run build` (runs `prisma generate`). Start command: `npm start`.
- Set every variable from `.env.example` in the host's environment settings. `SITE_URL` must be the final `https://` domain.
- **Uploads:** serverless hosts have no lasting disk. Set the four `CLOUDINARY_*` variables before the client uploads anything; the dashboard warns while they are missing in production.
- The public page renders on each request from the database, so saved settings appear immediately with no cache to purge.
- Rate limits are stored in the database, so they hold across server instances. They key on the client IP from `x-forwarded-for`; keep the site behind a proxy that sets it (Vercel, Cloudflare, Nginx).

## 3. Email notifications

Choose one:

- **Resend:** set `RESEND_API_KEY` and `MAIL_FROM` with an address on a domain verified in Resend.
- **SMTP:** set `SMTP_HOST`, `SMTP_PORT` (587 or 465), `SMTP_USER`, `SMTP_PASSWORD`, `MAIL_FROM`. Gmail works with an app password.

Each enquiry records whether its notification was sent, failed or skipped (visible on the enquiry page). Enquiries are always saved first, so a mail outage loses nothing.

The recipient is set in **Website settings, Contact details, "Send new enquiries to"**.

## 4. First admin

```bash
npm run admin:create -- --email owner@example.com --name "Owner Name"
```

Then sign in at `/admin` and change the temporary password under **My account**.

## 5. Backups and recovery

- **Managed PostgreSQL:** enable the provider's automated daily backups and point-in-time recovery (Neon, Supabase and most hosts offer this). Test a restore into a separate database once before launch.
- **Manual backup:** `pg_dump "$DATABASE_URL" -Fc -f meilleur-$(date +%F).dump`; restore with `pg_restore -d "$NEW_DATABASE_URL" meilleur-YYYY-MM-DD.dump`.
- **Images:** Cloudinary keeps uploaded originals; enable its backup option, or periodically export the `meilleur/` folder.
- **Static project photographs** in `public/work/` are part of the repository.
- **SQLite (local only):** copy `prisma/dev.db` while the server is stopped.

## 6. Pre-launch checklist

- [ ] Client confirms email, telephone and address (Website settings, Contact details).
- [ ] Client supplies the LinkedIn company URL, or leaves it empty (it stays hidden).
- [ ] Team profiles added with approved names, titles, portraits and biographies, or the team statement kept.
- [ ] Project descriptions and client names added only where the client approves them.
- [ ] Email and Cloudinary configured; send one test enquiry and confirm it arrives.
- [ ] Theme chosen and published.
- [ ] `SITE_URL` set to the live domain; check `/robots.txt` and `/sitemap.xml`.
- [ ] Backups enabled and a restore tested.

## Known platform note

The development folder path contains an apostrophe (`Mahedi's Client`), which breaks Next.js's `robots.ts`/`sitemap.ts` loaders. `robots.txt` and `sitemap.xml` are therefore plain route handlers with identical output. This has no effect on deployment.
