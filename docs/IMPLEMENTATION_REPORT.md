# Implementation report

Date: 26 October 2026.

## Starting point

The folder held only `build_prompt.md` and `Business Profile.pdf`; there was no existing code or database, so this is a new build on the recommended stack. From the PDF I extracted:

- Contact details (email, telephone, address), the About text, three strengths, the expertise and services lists, and the tagline "Your event | Your success | Our expertise".
- 17 programme-experience projects (Asia Pharma Expo appears as three separate editions, 2023, 2024 and 2025, each with its own photographs) and 57 photographs, saved per project in `public/work/`.
- The logo, re-traced from the PDF's vector art into a transparent mask (`public/brand/meilleur-logo.png`), and the parchment palette sampled from the page backgrounds (#d8c090 to #e8d0a0).

## Completed

**Public site**: six anchored sections (Home, Services, About us, Team, Work, Contact), sticky compacting navigation with an active-section indicator, mobile menu, skip link.
- Two themes from one set of tokens (`src/styles/tokens.css`):
  - **Heritage editorial** (default): parchment, logo ink, tobacco-brown accent, Gloock and Hanken Grotesk. The hero photograph sits in a drawn stand-plan frame with dimension lines, and the process is drawn as four bays along an aisle.
  - **Contemporary exhibition**: hall-night, booth-white and carpet-red panels with Antonio condensed type.
- The theme is rendered on the server, so the wrong theme never flashes on load.
- Gallery: category filters, cover images, a lightbox with every published photograph (arrow keys, Escape, focus return, lazy loading).
- Contact form: validated in the browser and again on the server. It has a honeypot, a minimum fill time, database-backed rate limiting and duplicate detection. Enquiries are stored before the email notification is sent, and the form shows clear success and error states.
- Floating email, telephone and LinkedIn buttons. LinkedIn appears only once a URL is configured. On phones the buttons move to the bottom, and they step aside while the form is on screen.
- SEO: title, description, canonical, Open Graph and Twitter tags, LocalBusiness JSON-LD, `robots.txt`, `sitemap.xml`.

**Admin panel** (`/admin`):
- Dashboard: live counts, enquiries by status, latest enquiries, recent changes, quick actions, and warnings when email or storage is not configured.
- Projects: create, edit, publish, unpublish, archive and delete (admin only), plus reordering. Photographs support multi-upload, server-side type and size checks (decoded with Sharp, not trusted by extension), re-encoding to WebP, cover selection, ordering, alt text, captions, and publish or archive per photograph.
- Services: edit, image, reorder, show or hide, featured. Team: profiles, portraits, LinkedIn, reorder, publish.
- Enquiries: search; filters by status, event type, assignee and date range; sort by newest, oldest or status; detail view; status changes; assignment; internal notes that can be added and edited; history; CSV export (admin only, formula-injection safe, follows the current filters).
- Website settings: theme with a live desktop or mobile preview of the real site before publishing; logo, hero, button labels and links, all section text, strengths and process steps, contact details, enquiry recipient, social links, floating buttons, footer, SEO and sharing image, featured content.
- Users (Admin and Editor roles), activity log, own password change, emailed password reset.

**Security**: bcrypt hashing (cost 12); database sessions with hashed tokens; httpOnly SameSite=Lax cookies (Secure in production); 8-hour sliding expiry; role checks on every page, action and API route; origin checks on route handlers (Next's built-in CSRF protection covers server actions); login and reset rate limits; constant-time answers for unknown emails; explicit column selection so internal fields never reach public queries; security headers; `noindex` on the admin and preview.

## Redesign (27 October 2026): "From empty floor to opening night"

The client found the first version too much like a photo album. The public page was redesigned around what MEILLEUR does: turning an empty hall into a finished event.

- **Hero:** a hall plan draws itself on a drafting grid, and a work lamp follows the pointer.
- **Services:** shown as stands on an expo floor plan, with a flip-board directory.
- **Values:** the company tagline is lit phrase by phrase, each phrase paired with the profile strength that backs it.
- **Build sequence:** a 3D stand is set out, framed, clad, rigged and lit as the visitor scrolls, one act per process step.
- **Work:** a horizontal corridor of flagship projects, then a typographic index of every programme with pointer previews.

Admin, data and all wiring are unchanged. Every animation has a finished static state for reduced motion and no-script visitors. The scroll engine is a small first-party hook (`src/components/site/useScrollProgress.ts`); no animation library was added.

## Test results

All of these ran against the real SQLite database.

| Check | Result |
| --- | --- |
| `npm run typecheck` | Passed |
| `npm run lint` | Passed, no warnings |
| `npm test` (unit: CSV escaping, validation, settings merge and safety, slugs, reorder, password rule) | 12 of 12 passed |
| `npm run build` | Passed |
| `npm run test:e2e` against the production build (43 checks: sections and nav, metadata, auth walls, forged and expired sessions, cross-site refusal, validation, honeypot, timing trap, storage, duplicate handling, notes never public, CSV role, filter and formula safety, preview) | 43 of 43 passed |
| Settings sync in the browser on the production build: edit phone, theme and hero text; invalid input rejected with nothing saved; change visible on the next public request; still correct after a server restart and a new session | Passed |
| Image upload in the browser: real JPEG stored as WebP; a disguised non-image rejected; delete removes the file | Passed |
| Contact form in the browser: empty submit shows six field errors; valid submit stored with confirmation | Passed |
| Hallmark design lint with render tier at 375, 1280, 1440 and 1920 px (overflow, fold, contrast, focus, motion) | 0 failures |

Fixed along the way:
- The phone gutter was overridden by the theme block.
- Gallery images did not render (an inline element ignored the aspect ratio).
- The first page view after a save showed the old version, so the home page now renders on each request.
- Next's metadata loader broke on the apostrophe in the folder path.
- Floating buttons disappeared on the red panel.
- Some contrast and focus details.

## Not verified or blocked

- **Email delivery:** blocked until credentials are provided. With no provider configured, notifications are logged and marked "skipped". The Resend and SMTP code paths are written but unverified.
- **Cloudinary uploads:** unverified without credentials. Local disk storage is verified.
- **PostgreSQL:** not tested, because no server was available. The schema is provider-neutral; switching steps are in `docs/DEPLOYMENT.md`.
- **Deployment:** not deployed.
- **Backups:** procedures documented, not tested.
- **Lighthouse and Core Web Vitals:** not measured. The page uses next/image (AVIF and WebP, lazy loading below the fold), self-hosted fonts and about 127 kB of first-load JavaScript.
- Tablet layouts were checked through the responsive breakpoints and the 1280 px render. A dedicated pass on a physical tablet has not been done.

## Needs client input

1. Confirm the email, telephone (+880 1719 383114) and address.
2. The LinkedIn company URL. None was in the profile, so it stays hidden.
3. Team members: approved names, titles, portraits, biographies and LinkedIn links. Until then the Team section shows a statement drawn from the profile.
4. Project descriptions, client names and venues the client approves showing. The profile has only titles and years. Arbocel's launch has no year in the profile.
5. Better alt text for photographs (the seed uses a short generic description per project).
6. Email provider and Cloudinary account credentials, and the production domain.

## Deviations from the brief

- **Framer Motion not used:** the brief asks for restrained motion and the two animations (the drawn plan lines and the photograph rise) are CSS with reduced-motion fallbacks, so the dependency was not needed.
- **Auth.js not used:** a small first-party session system (database sessions, hashed tokens) fits the credentials-only, role-based admin better than Auth.js's credentials provider, which forces JWT sessions and cannot be revoked server-side.
- **SQLite for local development:** used because PostgreSQL was unavailable (see above).
