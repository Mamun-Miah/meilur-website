import type { ThemeName } from "@/lib/constants";
import type { getHomeContent } from "@/lib/content";
import { telHref } from "@/lib/settings";
import { Contact } from "./Contact";
import { FloatingActions } from "./FloatingActions";
import { Header } from "./Header";
import { NAV } from "./nav";
import { Logo } from "./Logo";
import { WordmarkHero } from "./WordmarkHero";
import { BuildSequence } from "./BuildSequence";
import { Manifesto } from "./Manifesto";
import { Team } from "./Sections";
import { ServicesFloor } from "./ServicesFloor";
import { surface } from "./surfaces";
import { Work } from "./Work";

type Content = Awaited<ReturnType<typeof getHomeContent>>;

const MOTION_SCRIPT = `if(!matchMedia("(prefers-reduced-motion: reduce)").matches)document.documentElement.classList.add("motion")`;

export function SitePage({ content, theme, previewNote }: { content: Content; theme: ThemeName; previewNote?: string }) {
  const { settings, services, team, projects } = content;
  const { contact, floating, footer, brand, hero } = settings;
  const year = new Date().getFullYear();

  const tagline = footer.tagline.split("|").map((t) => t.trim()).filter(Boolean);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "LocalBusiness",
    name: "MEILLEUR",
    description: settings.seo.description,
    email: contact.email,
    telephone: contact.phone,
    address: { "@type": "PostalAddress", streetAddress: contact.address, addressLocality: "Dhaka", addressCountry: "BD" },
    url: process.env.SITE_URL || undefined,
    sameAs: [contact.linkedinUrl, contact.facebookUrl, contact.instagramUrl].filter(Boolean),
  };

  return (
    <div className="site" data-theme={theme}>
      {/* Before first paint: opt into choreography unless the visitor prefers reduced motion. */}
      <script dangerouslySetInnerHTML={{ __html: MOTION_SCRIPT }} />
      <a className="skip-link" href="#main">
        Skip to content
      </a>
      {previewNote ? <p className="preview-banner">{previewNote}</p> : null}
      <Header logoUrl={brand.logoUrl} logoAlt={brand.logoAlt} ctaLabel={hero.primaryLabel} ctaHref={hero.primaryHref} />
      <main id="main">
        <WordmarkHero
          headline={hero.headline}
          lede={hero.lede}
          primary={{ label: hero.primaryLabel, href: hero.primaryHref }}
          secondary={{ label: hero.secondaryLabel, href: hero.secondaryHref }}
          photo={{ src: hero.imageUrl, alt: hero.imageAlt, caption: hero.imageCaption }}
          brand={brand.logoAlt}
          surface={surface(theme, "hero")}
        />
        <ServicesFloor services={services} heading={settings.sections.servicesHeading} intro={settings.sections.servicesIntro} surface={surface(theme, "services")} />
        {tagline.length ? (
          <Manifesto lines={tagline} proofs={settings.sections.strengths} body={settings.sections.aboutBody} surface={surface(theme, "manifesto")} />
        ) : null}
        <BuildSequence steps={settings.sections.process} surface={surface(theme, "build")} />
        <Team theme={theme} settings={settings} team={team} />
        <Work
          projects={projects}
          heading={settings.sections.workHeading}
          intro={settings.sections.workIntro}
          surface={surface(theme, "work")}
          indexSurface={surface(theme, "index")}
        />
        <Contact settings={settings} surface={surface(theme, "contact")} />
      </main>
      <footer className="site-footer" data-surface={surface(theme, "footer")}>
        <div className="container grid site-footer__grid">
          <div className="site-footer__brand">
            <Logo src={brand.logoUrl} label={brand.logoAlt} />
            {footer.tagline ? (
              <p className="site-footer__tagline">
                {footer.tagline.split("|").map((part) => (
                  <span key={part}>{part.trim()}</span>
                ))}
              </p>
            ) : null}
          </div>
          <div className="site-footer__col">
            <h2>Office</h2>
            <p>{contact.address}</p>
            {footer.note ? <p className="site-footer__note">{footer.note}</p> : null}
          </div>
          <div className="site-footer__col">
            <h2>Contact</h2>
            <ul>
              <li>
                <a href={`mailto:${contact.email}`}>{contact.email}</a>
              </li>
              <li>
                <a href={telHref(contact.phone)}>{contact.phone}</a>
              </li>
              {[
                ["LinkedIn", contact.linkedinUrl],
                ["Facebook", contact.facebookUrl],
                ["Instagram", contact.instagramUrl],
              ]
                .filter(([, url]) => url)
                .map(([label, url]) => (
                  <li key={label}>
                    <a href={url} target="_blank" rel="noopener noreferrer">
                      {label}
                      <span className="visually-hidden"> (opens in a new tab)</span>
                    </a>
                  </li>
                ))}
            </ul>
          </div>
          <nav className="site-footer__col" aria-label="Footer">
            <h2>On this page</h2>
            <ul>
              {NAV.map((n) => (
                <li key={n.id}>
                  <a href={`#${n.id}`}>{n.label}</a>
                </li>
              ))}
            </ul>
          </nav>
          <div className="site-footer__base">
            <p>{`© ${year} MEILLEUR, Dhaka`}</p>
          </div>
        </div>
      </footer>
      {floating.enabled ? (
        <FloatingActions
          email={floating.email ? contact.email : undefined}
          tel={floating.phone ? telHref(contact.phone) : undefined}
          phoneLabel={contact.phone}
          linkedin={floating.linkedin && contact.linkedinUrl ? contact.linkedinUrl : undefined}
        />
      ) : null}
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />
    </div>
  );
}
