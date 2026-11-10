"use client";

import { useEffect, useState } from "react";
import { LinkedInIcon, MailIcon, PhoneIcon } from "./Icons";

type Props = { email?: string; tel?: string; phoneLabel?: string; linkedin?: string };

/** Right-edge contact actions. They step aside while the enquiry form is on screen so they never cover it. */
export function FloatingActions({ email, tel, phoneLabel, linkedin }: Props) {
  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    const target = document.getElementById("contact");
    if (!target) return;
    const observer = new IntersectionObserver(([entry]) => setHidden(entry.isIntersecting), { threshold: 0.15 });
    observer.observe(target);
    return () => observer.disconnect();
  }, []);

  if (!email && !tel && !linkedin) return null;

  return (
    <aside className="float-actions" aria-label="Contact MEILLEUR" data-hidden={hidden} inert={hidden ? true : undefined}>
      {email ? (
        <a className="float-action" href={`mailto:${email}`} aria-label={`Email ${email}`}>
          <MailIcon />
          <span className="float-action__tip" aria-hidden="true">
            Email us
          </span>
        </a>
      ) : null}
      {tel ? (
        <a className="float-action" href={tel} aria-label={`Call ${phoneLabel ?? "us"}`}>
          <PhoneIcon />
          <span className="float-action__tip" aria-hidden="true">
            Call {phoneLabel}
          </span>
        </a>
      ) : null}
      {linkedin ? (
        <a className="float-action" href={linkedin} target="_blank" rel="noopener noreferrer" aria-label="MEILLEUR on LinkedIn (opens in a new tab)">
          <LinkedInIcon />
          <span className="float-action__tip" aria-hidden="true">
            LinkedIn
          </span>
        </a>
      ) : null}
    </aside>
  );
}
