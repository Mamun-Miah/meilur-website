import Link from "next/link";
import { saveSettingsGroup } from "@/app/admin/actions/settings";
import { ActionForm, Check, Field, Submit } from "@/components/admin/Form";
import { PageHeader } from "@/components/admin/PageHeader";
import { ThemePicker } from "@/components/admin/ThemePicker";
import { requireUser } from "@/lib/auth";
import { THEME_LABELS } from "@/lib/constants";
import { getSettings } from "@/lib/content";
import { db } from "@/lib/db";

export const metadata = { title: "Website settings" };

const fmt = new Intl.DateTimeFormat("en-GB", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Dhaka" });

function Group({ id, title, intro, children }: { id: string; title: string; intro?: string; children: React.ReactNode }) {
  return (
    <section id={id} className="a-card scroll-mt-6 p-6" aria-labelledby={`${id}-title`}>
      <h2 id={`${id}-title`} className="text-xl font-bold">
        {title}
      </h2>
      {intro ? <p className="mt-1 max-w-2xl text-sm text-muted">{intro}</p> : null}
      <div className="mt-5">{children}</div>
    </section>
  );
}

const IMG = "image/jpeg,image/png,image/webp,image/avif";

export default async function SettingsPage() {
  await requireUser("ADMIN");
  const s = await getSettings();
  const [featuredProjects, featuredServices] = await Promise.all([
    db.project.findMany({ where: { featured: true }, select: { id: true, title: true, year: true, status: true } }),
    db.service.findMany({ where: { featured: true }, select: { id: true, title: true } }),
  ]);
  const save = (group: Parameters<typeof saveSettingsGroup>[0]) => saveSettingsGroup.bind(null, group);
  const pad = <T,>(arr: T[], n: number, fill: T) => [...arr, ...Array(Math.max(0, n - arr.length)).fill(fill)].slice(0, n);

  return (
    <>
      <PageHeader
        title="Website settings"
        intro={`Everything here is saved to the database and shown on the live website straight away.${s.updatedAt ? ` Last saved ${fmt.format(s.updatedAt)}.` : ""}`}
      />
      <nav aria-label="Settings sections" className="mb-6 flex flex-wrap gap-2 text-sm">
        {[
          ["theme", "Theme"],
          ["hero", "Hero"],
          ["sections", "Page text"],
          ["contact", "Contact and floating buttons"],
          ["brand", "Logo"],
          ["footer", "Footer"],
          ["seo", "Search and sharing"],
          ["featured", "Featured content"],
        ].map(([id, label]) => (
          <a key={id} href={`#${id}`} className="a-btn a-btn--quiet a-btn--sm">
            {label}
          </a>
        ))}
      </nav>

      <div className="grid gap-6">
        <Group id="theme" title="Theme" intro="Both themes use the same content. Preview one, then publish it.">
          <ThemePicker
            live={s.theme}
            themes={[
              { value: "heritage", label: THEME_LABELS.heritage, description: "Parchment, ink and an editorial serif, drawn from the business profile." },
              { value: "exhibition", label: THEME_LABELS.exhibition, description: "Dark hall, white booths and carpet red, with bold condensed type." },
            ]}
          />
        </Group>

        <Group id="hero" title="Hero" intro="The first screen visitors see.">
          <ActionForm action={save("hero")} className="grid gap-5 sm:grid-cols-2">
            <Field name="headline" label="Headline" defaultValue={s.hero.headline} required multiline rows={2} maxLength={90} className="sm:col-span-2" hint="Press Enter where you want the line to break. Seven words or fewer reads best." />
            <Field name="lede" label="Supporting sentence" defaultValue={s.hero.lede} required maxLength={160} className="sm:col-span-2" />
            <Field name="primaryLabel" label="Main button label" defaultValue={s.hero.primaryLabel} required maxLength={28} />
            <Field name="primaryHref" label="Main button goes to" defaultValue={s.hero.primaryHref} required hint="#contact, #work, a page path or a full address." />
            <Field name="secondaryLabel" label="Second button label" defaultValue={s.hero.secondaryLabel} required maxLength={28} />
            <Field name="secondaryHref" label="Second button goes to" defaultValue={s.hero.secondaryHref} required />
            <div className="grid gap-4 sm:col-span-2 sm:grid-cols-[220px_minmax(0,1fr)]">
              {s.hero.imageUrl ? <img src={s.hero.imageUrl} alt="" width={220} height={165} className="aspect-[4/3] w-full rounded object-cover" /> : <div className="aspect-[4/3] rounded bg-sunk" />}
              <div className="grid content-start gap-4">
                <Field name="imageFile" label="Upload a new hero photograph" type="file" accept={IMG} hint="It fills the letters of the MEILLEUR wordmark. A bold, well-lit stand photo works best." />
                <Field name="imageUrl" label="Or image address" defaultValue={s.hero.imageUrl} hint="Paste the address of a project photograph, e.g. /work/textech-2025/02.jpg" />
                <Field name="imageAlt" label="Photograph description" defaultValue={s.hero.imageAlt} maxLength={160} />
                <Field name="imageCaption" label="Project name for the photograph" defaultValue={s.hero.imageCaption} maxLength={80} hint="For your records; the current design does not print it on the page." />
              </div>
            </div>
            <div className="sm:col-span-2">
              <Submit>Save hero</Submit>
            </div>
          </ActionForm>
        </Group>

        <Group id="sections" title="Page text" intro="Headings and text for Services, About us, Team, Work and Contact.">
          <ActionForm action={save("sections")} className="grid gap-5 sm:grid-cols-2">
            <Field name="servicesHeading" label="Services heading" defaultValue={s.sections.servicesHeading} required maxLength={80} />
            <Field name="servicesIntro" label="Services introduction" defaultValue={s.sections.servicesIntro} maxLength={220} />
            <Field name="aboutHeading" label="About us heading" defaultValue={s.sections.aboutHeading} required maxLength={80} className="sm:col-span-2" />
            <Field name="aboutBody" label="About us text" defaultValue={s.sections.aboutBody} required multiline rows={5} maxLength={1200} className="sm:col-span-2" hint="Leave an empty line between paragraphs. Use only facts the company can stand behind." />
            <fieldset className="grid gap-3 sm:col-span-2">
              <legend className="mb-1 text-sm font-semibold">Strengths (up to six; empty lines are skipped)</legend>
              {pad(s.sections.strengths, 6, "").map((v, i) => (
                <Field key={i} name={`strength${i}`} label={`Strength ${i + 1}`} defaultValue={v} maxLength={120} />
              ))}
            </fieldset>
            <fieldset className="grid gap-3 sm:col-span-2 sm:grid-cols-2">
              <legend className="mb-1 text-sm font-semibold">How a project runs (two to six steps; a step without a title is skipped)</legend>
              {pad(s.sections.process, 6, { title: "", text: "" }).map((step, i) => (
                <div key={i} className="grid gap-2 rounded-md border border-line p-3">
                  <Field name={`processTitle${i}`} label={`Step ${i + 1} title`} defaultValue={step.title} maxLength={24} />
                  <Field name={`processText${i}`} label={`Step ${i + 1} text`} defaultValue={step.text} maxLength={140} />
                </div>
              ))}
            </fieldset>
            <div className="grid gap-4 sm:col-span-2 sm:grid-cols-[160px_minmax(0,1fr)]">
              {s.sections.aboutImageUrl ? <img src={s.sections.aboutImageUrl} alt="" width={160} height={200} className="aspect-[4/5] w-full rounded object-cover" /> : <div className="aspect-[4/5] rounded bg-sunk" />}
              <div className="grid content-start gap-4">
                <Field name="aboutImageFile" label="Upload a new About us photograph" type="file" accept={IMG} />
                <Field name="aboutImageUrl" label="Or image address" defaultValue={s.sections.aboutImageUrl} />
                <Field name="aboutImageAlt" label="Photograph description" defaultValue={s.sections.aboutImageAlt} maxLength={160} />
              </div>
            </div>
            <Field name="teamHeading" label="Team heading" defaultValue={s.sections.teamHeading} required maxLength={80} />
            <Field name="teamIntro" label="Team statement" defaultValue={s.sections.teamIntro} maxLength={260} hint="Shown large while no team profiles are published." />
            <Field name="workHeading" label="Work heading" defaultValue={s.sections.workHeading} required maxLength={80} />
            <Field name="workIntro" label="Work introduction" defaultValue={s.sections.workIntro} maxLength={220} />
            <Field name="contactHeading" label="Contact heading" defaultValue={s.sections.contactHeading} required maxLength={80} />
            <Field name="contactIntro" label="Contact introduction" defaultValue={s.sections.contactIntro} maxLength={260} />
            <div className="sm:col-span-2">
              <Submit>Save page text</Submit>
            </div>
          </ActionForm>
        </Group>

        <Group id="contact" title="Contact details and floating buttons" intro="Used in the Contact section, the footer, the floating buttons and search results.">
          <ActionForm action={save("contact")} className="grid gap-5 sm:grid-cols-2">
            <Field name="email" label="Contact email" type="email" defaultValue={s.contact.email} required />
            <Field name="phone" label="Telephone" type="tel" defaultValue={s.contact.phone} required hint="With country code, e.g. +880 1719 383114" />
            <Field name="address" label="Office address" defaultValue={s.contact.address} required className="sm:col-span-2" />
            <Field name="notifyEmail" label="Send new enquiries to" type="email" defaultValue={s.contact.notifyEmail} required className="sm:col-span-2" hint="Every enquiry from the website is emailed here and saved under Enquiries." />
            <Field name="linkedinUrl" label="LinkedIn company page" type="url" defaultValue={s.contact.linkedinUrl} hint="Full https:// address. Leave empty to hide LinkedIn everywhere." />
            <Field name="facebookUrl" label="Facebook page" type="url" defaultValue={s.contact.facebookUrl} />
            <Field name="instagramUrl" label="Instagram profile" type="url" defaultValue={s.contact.instagramUrl} />
            <fieldset className="grid gap-3 sm:col-span-2">
              <legend className="mb-1 text-sm font-semibold">Floating contact buttons</legend>
              <Check name="floatingEnabled" label="Show floating buttons on the right edge" defaultChecked={s.floating.enabled} hint="On phones they sit at the bottom and step aside while the enquiry form is on screen." />
              <Check name="floatingEmail" label="Email button" defaultChecked={s.floating.email} />
              <Check name="floatingPhone" label="Telephone button" defaultChecked={s.floating.phone} />
              <Check name="floatingLinkedin" label="LinkedIn button" defaultChecked={s.floating.linkedin} hint={s.contact.linkedinUrl ? undefined : "Appears once a LinkedIn address is saved above."} />
            </fieldset>
            <div className="sm:col-span-2">
              <Submit>Save contact details</Submit>
            </div>
          </ActionForm>
        </Group>

        <Group id="brand" title="Logo" intro="The logo is painted in the theme's ink colour, so upload a transparent PNG or WebP of the mark.">
          <ActionForm action={save("brand")} className="grid gap-5 sm:grid-cols-[200px_minmax(0,1fr)]">
            <div className="grid place-items-center rounded-md bg-sunk p-4">
              <img src={s.brand.logoUrl} alt="Current logo" width={160} height={100} className="h-auto w-40" />
            </div>
            <div className="grid content-start gap-4">
              <Field name="logoFile" label="Upload a new logo" type="file" accept="image/png,image/webp" />
              <Field name="logoUrl" label="Or logo address" defaultValue={s.brand.logoUrl} />
              <Field name="logoAlt" label="Logo text for screen readers" defaultValue={s.brand.logoAlt} required maxLength={80} />
              <div>
                <Submit>Save logo</Submit>
              </div>
            </div>
          </ActionForm>
        </Group>

        <Group id="footer" title="Footer">
          <ActionForm action={save("footer")} className="grid gap-5 sm:grid-cols-2">
            <Field name="tagline" label="Tagline" defaultValue={s.footer.tagline} maxLength={120} hint="Separate lines with a vertical bar |" />
            <Field name="note" label="Short note under the address" defaultValue={s.footer.note} maxLength={240} />
            <div className="sm:col-span-2">
              <Submit>Save footer</Submit>
            </div>
          </ActionForm>
        </Group>

        <Group id="seo" title="Search and sharing" intro="How the site appears in Google and when a link is shared.">
          <ActionForm action={save("seo")} className="grid gap-5 sm:grid-cols-2">
            <Field name="title" label="Page title" defaultValue={s.seo.title} required maxLength={70} className="sm:col-span-2" hint="Up to 70 characters." />
            <Field name="description" label="Description" defaultValue={s.seo.description} required multiline rows={3} maxLength={170} className="sm:col-span-2" hint="Up to 170 characters." />
            <Field name="ogImageFile" label="Upload a sharing image" type="file" accept={IMG} hint="1200 by 630 pixels works best." />
            <Field name="ogImageUrl" label="Or sharing image address" defaultValue={s.seo.ogImageUrl} />
            <div className="sm:col-span-2">
              <Submit>Save search and sharing</Submit>
            </div>
          </ActionForm>
        </Group>

        <Group id="featured" title="Featured content" intro="Featured projects lead the Work section; featured services with an image are set larger. Change them on each project or service.">
          <div className="grid gap-6 sm:grid-cols-2">
            <div>
              <h3 className="font-semibold">Featured projects</h3>
              <ul className="mt-2 grid gap-1 text-sm">
                {featuredProjects.length ? (
                  featuredProjects.map((p) => (
                    <li key={p.id}>
                      <Link className="a-link" href={`/admin/projects/${p.id}`}>
                        {p.title} {p.year}
                      </Link>
                      {p.status !== "PUBLISHED" ? <span className="text-muted"> (not published)</span> : null}
                    </li>
                  ))
                ) : (
                  <li className="text-muted">None yet.</li>
                )}
              </ul>
              <Link className="a-btn a-btn--quiet a-btn--sm mt-3" href="/admin/projects">
                Manage projects
              </Link>
            </div>
            <div>
              <h3 className="font-semibold">Featured services</h3>
              <ul className="mt-2 grid gap-1 text-sm">
                {featuredServices.length ? (
                  featuredServices.map((sv) => (
                    <li key={sv.id}>
                      <Link className="a-link" href={`/admin/services/${sv.id}`}>
                        {sv.title}
                      </Link>
                    </li>
                  ))
                ) : (
                  <li className="text-muted">None yet.</li>
                )}
              </ul>
              <Link className="a-btn a-btn--quiet a-btn--sm mt-3" href="/admin/services">
                Manage services
              </Link>
            </div>
          </div>
        </Group>
      </div>
    </>
  );
}
