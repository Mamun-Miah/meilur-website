# MEILLEUR website and admin panel

One-page website for MEILLEUR (event management and exhibition production, Dhaka) with a database-backed admin panel at `/admin`.

- **Stack:** Next.js 15 (App Router), TypeScript, Prisma, Tailwind CSS 4 (admin), hand-written CSS with design tokens (public site), Zod, bcrypt, Nodemailer or Resend, Sharp, Cloudinary (optional).
- **Content source:** every project, photograph, service and contact detail in the seed comes from `Business Profile.pdf`. Nothing is invented. The team section and LinkedIn link stay empty until the client supplies real details.

## Quick start (local)

Requires Node.js 20 or newer.

```bash
npm install
cp .env.example .env        # then set ADMIN_EMAIL, ADMIN_NAME and ADMIN_PASSWORD
npx prisma migrate dev      # creates prisma/dev.db (SQLite) and runs the seed
npm run dev                 # http://localhost:3000, admin at /admin
```

The seed is safe to re-run (`npm run db:seed`); it never overwrites existing rows.

> npm 11+ may block install scripts. If Prisma or Sharp fail to load, run `npm install-scripts approve @prisma/client prisma @prisma/engines sharp esbuild unrs-resolver` (already recorded in `package.json` under `allowScripts`).

## Creating admin users

- **First admin:** set `ADMIN_EMAIL`, `ADMIN_NAME`, `ADMIN_PASSWORD` in `.env` before seeding, or run:
  ```bash
  npm run admin:create -- --email owner@example.com --name "Owner Name"
  ```
  Without `ADMIN_PASSWORD` in the environment, a strong temporary password is generated and printed once. Running the command for an existing email resets that account's password and signs out its sessions.
- **More users:** sign in as an admin and use **Users** in the sidebar (Admin or Editor role).
- **Forgotten password:** "Forgot your password?" on the sign-in screen emails a 30-minute, single-use link (email must be configured).

### Roles

| | Editor | Admin |
| --- | --- | --- |
| Projects, photographs, services, team (create, edit, publish, reorder, archive) | Yes | Yes |
| Enquiries: view, status, assign, internal notes | Yes | Yes |
| Permanent deletes | No | Yes |
| Website settings and theme, users, activity log, CSV export | No | Yes |

Every rule is enforced on the server (pages, server actions and API routes), not by hiding buttons.

## Scripts

| Command | What it does |
| --- | --- |
| `npm run dev` | Development server |
| `npm run build` / `npm start` | Production build and server |
| `npm run typecheck` | TypeScript check |
| `npm run lint` | ESLint |
| `npm test` | Unit tests (Vitest) |
| `npm run test:e2e` | End-to-end checks against a running server (`BASE_URL`, default `http://localhost:3000`) |
| `npm run db:migrate` / `npm run db:deploy` | Create a migration (dev) / apply migrations (production) |
| `npm run db:seed` | Seed profile content |
| `npm run admin:create` | Create an admin or reset a password |

## Environment variables

See `.env.example` for the full list with comments.

| Variable | Required | Purpose |
| --- | --- | --- |
| `DATABASE_URL` | Yes | SQLite file locally; PostgreSQL URL in production |
| `SITE_URL` | Yes | Public origin for canonical URLs, sitemap and email links |
| `ADMIN_EMAIL`, `ADMIN_NAME`, `ADMIN_PASSWORD` | Seeding only | First admin account |
| `RESEND_API_KEY` | One email option | Transactional email through Resend |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASSWORD` | Other email option | Any SMTP server |
| `MAIL_FROM` | With email | Sender, e.g. `MEILLEUR Website <website@yourdomain.com>` |
| `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`, `CLOUDINARY_FOLDER` | Production uploads | Image storage. Without them uploads go to `public/uploads` (local only) |

Secrets are only read on the server; none are exposed to the browser.

## Where things live

```
prisma/schema.prisma        data model;  prisma/seed.mjs  profile content
src/app/(site)/             public page and admin-only /preview
src/app/admin/              admin panel (login, reset, panel pages, server actions)
src/app/api/                enquiry intake, CSV export
src/components/site/        public sections (hero, services, about, team, work, contact)
src/lib/                    auth, settings, content queries, enquiries, storage, mail, CSV, rate limiting
src/styles/tokens.css       design tokens for both themes
src/styles/site.css         public site styles;  admin.css  admin styles
public/work/                project photographs extracted from the business profile
docs/                       deployment guide and implementation report
```

More: [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md), [docs/IMPLEMENTATION_REPORT.md](docs/IMPLEMENTATION_REPORT.md).
