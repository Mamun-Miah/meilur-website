"use client";

import { useEffect, useRef, useState } from "react";
import { EVENT_SCALES, EVENT_TYPES } from "@/lib/constants";
import { enquirySchema, fieldErrors, type EnquiryFieldErrors } from "@/lib/enquiry-schema";
import type { SiteSettings } from "@/lib/settings";
import { telHref } from "@/lib/settings";

type Status = { tone: "success" | "error"; text: string } | null;

export function Contact({ settings, surface }: { settings: SiteSettings; surface: string }) {
  const { contact, sections } = settings;
  const [errors, setErrors] = useState<EnquiryFieldErrors>({});
  const [status, setStatus] = useState<Status>(null);
  const [pending, setPending] = useState(false);
  const startedAt = useRef<number>(0);
  const statusRef = useRef<HTMLParagraphElement>(null);

  useEffect(() => {
    startedAt.current = Date.now();
  }, []);

  // Field errors keep focus on the first invalid field; other outcomes move focus to the message.
  useEffect(() => {
    if (status && Object.keys(errors).length === 0) statusRef.current?.focus();
  }, [status, errors]);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (pending) return;
    const form = e.currentTarget;
    const data = Object.fromEntries(new FormData(form).entries()) as Record<string, string>;
    const parsed = enquirySchema.safeParse(data);
    if (!parsed.success) {
      const errs = fieldErrors(parsed.error);
      setErrors(errs);
      setStatus({ tone: "error", text: "Please check the highlighted fields." });
      const first = Object.keys(errs)[0];
      if (first) (form.elements.namedItem(first) as HTMLElement | null)?.focus();
      return;
    }
    setErrors({});
    setStatus(null);
    setPending(true);
    try {
      const res = await fetch("/api/enquiries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...parsed.data, website: data.website ?? "", elapsedMs: Date.now() - startedAt.current }),
      });
      const json = (await res.json().catch(() => ({}))) as { message?: string; errors?: EnquiryFieldErrors };
      if (res.ok) {
        form.reset();
        startedAt.current = Date.now();
        setStatus({ tone: "success", text: json.message ?? `Thank you. Your enquiry has reached our team and we will reply to ${parsed.data.email}.` });
      } else {
        if (json.errors) setErrors(json.errors);
        setStatus({ tone: "error", text: json.message ?? "Something went wrong on our side. Please try again, or email us directly." });
      }
    } catch {
      setStatus({ tone: "error", text: `We could not reach the server. Check your connection, or email ${contact.email}.` });
    } finally {
      setPending(false);
    }
  }

  const err = (k: keyof EnquiryFieldErrors) => ({
    "aria-invalid": errors[k] ? true : undefined,
    "aria-describedby": errors[k] ? `${k}-error` : undefined,
  });

  return (
    <section id="contact" className="section contact" data-surface={surface} aria-labelledby="contact-title">
      <div className="container grid contact__grid">
        <div className="contact__intro">
          <h2 id="contact-title">{sections.contactHeading}</h2>
          {sections.contactIntro ? <p>{sections.contactIntro}</p> : null}
          <dl className="channels">
            <div>
              <dt>Email</dt>
              <dd>
                <a href={`mailto:${contact.email}`}>{contact.email}</a>
              </dd>
            </div>
            <div>
              <dt>Telephone</dt>
              <dd>
                <a href={telHref(contact.phone)}>{contact.phone}</a>
              </dd>
            </div>
            {contact.linkedinUrl ? (
              <div>
                <dt>LinkedIn</dt>
                <dd>
                  <a href={contact.linkedinUrl} target="_blank" rel="noopener noreferrer">
                    MEILLEUR on LinkedIn<span className="visually-hidden"> (opens in a new tab)</span>
                  </a>
                </dd>
              </div>
            ) : null}
            <div>
              <dt>Office</dt>
              <dd>{contact.address}</dd>
            </div>
          </dl>
        </div>

        <div className="enquiry">
          <form noValidate onSubmit={onSubmit} aria-describedby="enquiry-note">
            <div className="field">
              <label htmlFor="name">Your name</label>
              <input id="name" name="name" autoComplete="name" required maxLength={100} {...err("name")} />
              <p id="name-error" className="field__error">{errors.name}</p>
            </div>
            <div className="field">
              <label htmlFor="email">Business email</label>
              <input id="email" name="email" type="email" autoComplete="email" required maxLength={160} {...err("email")} />
              <p id="email-error" className="field__error">{errors.email}</p>
            </div>
            <div className="field">
              <label htmlFor="phone">Telephone</label>
              <input id="phone" name="phone" type="tel" autoComplete="tel" required maxLength={30} {...err("phone")} />
              <p id="phone-error" className="field__error">{errors.phone}</p>
            </div>
            <div className="field">
              <label htmlFor="eventType">Type of event</label>
              <select id="eventType" name="eventType" required defaultValue="" {...err("eventType")}>
                <option value="" disabled>
                  Choose one
                </option>
                {EVENT_TYPES.map((t) => (
                  <option key={t}>{t}</option>
                ))}
              </select>
              <p id="eventType-error" className="field__error">{errors.eventType}</p>
            </div>
            <div className="field">
              <label htmlFor="eventDate">
                Expected date <span className="optional">(optional)</span>
              </label>
              <input id="eventDate" name="eventDate" type="date" {...err("eventDate")} />
              <p id="eventDate-error" className="field__error">{errors.eventDate}</p>
            </div>
            <div className="field">
              <label htmlFor="venue">Venue or city</label>
              <input id="venue" name="venue" required maxLength={160} {...err("venue")} />
              <p id="venue-error" className="field__error">{errors.venue}</p>
            </div>
            <div className="field field--wide">
              <label htmlFor="scale">
                Expected attendance <span className="optional">(optional)</span>
              </label>
              <select id="scale" name="scale" defaultValue="" {...err("scale")}>
                <option value="">Not specified</option>
                {EVENT_SCALES.map((t) => (
                  <option key={t}>{t}</option>
                ))}
              </select>
              <p id="scale-error" className="field__error">{errors.scale}</p>
            </div>
            <div className="field field--wide">
              <label htmlFor="message">Project brief</label>
              <textarea id="message" name="message" required maxLength={4000} rows={6} {...err("message")} />
              <p id="message-error" className="field__error">{errors.message}</p>
            </div>
            <div className="hp" aria-hidden="true">
              <label htmlFor="website">Leave this field empty</label>
              <input id="website" name="website" tabIndex={-1} autoComplete="off" />
            </div>
            {status ? (
              <p ref={statusRef} tabIndex={-1} className="form-status" data-tone={status.tone} role={status.tone === "error" ? "alert" : "status"}>
                {status.text}
              </p>
            ) : null}
            <div className="form-actions">
              <button className="btn" type="submit" disabled={pending} aria-busy={pending}>
                {pending ? "Sending" : "Send enquiry"}
              </button>
              <p id="enquiry-note" className="form-note">
                We use these details only to reply to your enquiry.
              </p>
            </div>
          </form>
        </div>
      </div>
    </section>
  );
}
