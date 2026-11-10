import Image from "next/image";
import type { ThemeName } from "@/lib/constants";
import type { PublicTeamMember } from "@/lib/content";
import type { SiteSettings } from "@/lib/settings";
import { surface } from "./surfaces";
import { typeset } from "@/lib/typeset";

type Ctx = { theme: ThemeName; settings: SiteSettings };

export function Team({ theme, settings, team }: Ctx & { team: PublicTeamMember[] }) {
  const s = settings.sections;
  return (
    <section id="team" className="section team" data-surface={surface(theme, "team")} aria-labelledby="team-title">
      <div className="container grid team__grid">
        {team.length === 0 ? (
          <>
            <div className="section-head">
              <h2 id="team-title">{typeset(s.teamHeading)}</h2>
            </div>
            {s.teamIntro ? <p className="team__statement">{typeset(s.teamIntro)}</p> : null}
            <div className="team__aside">
              <a className="text-link" href="#contact">
                Talk to the team
              </a>
            </div>
          </>
        ) : (
          <>
            <div className="section-head">
              <h2 id="team-title">{typeset(s.teamHeading)}</h2>
              {s.teamIntro ? <p>{s.teamIntro}</p> : null}
            </div>
            <ul className="team-list">
              {team.map((m) => (
                <li key={m.id} className="member">
                  <div className="member__photo">
                    {m.photoUrl ? (
                      <Image src={m.photoUrl} alt={m.photoAlt || `Portrait of ${m.name}`} width={600} height={750} sizes="(max-width: 40rem) 100vw, 25vw" />
                    ) : null}
                  </div>
                  <h3>{typeset(m.name)}</h3>
                  <p className="member__role">{m.jobTitle}</p>
                  {m.bio ? <p className="member__bio">{m.bio}</p> : null}
                  {m.linkedinUrl ? (
                    <a className="text-link member__link" href={m.linkedinUrl} target="_blank" rel="noopener noreferrer">
                      LinkedIn profile<span className="visually-hidden"> of {m.name} (opens in a new tab)</span>
                    </a>
                  ) : null}
                </li>
              ))}
            </ul>
          </>
        )}
      </div>
    </section>
  );
}
