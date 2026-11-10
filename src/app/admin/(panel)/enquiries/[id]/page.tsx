import Link from "next/link";
import { notFound } from "next/navigation";
import { addNote, editNote, updateEnquiry } from "@/app/admin/actions/enquiries";
import { ActionForm, Field, SelectField, Submit } from "@/components/admin/Form";
import { PageHeader } from "@/components/admin/PageHeader";
import { requireUser } from "@/lib/auth";
import { ENQUIRY_STATUSES, ENQUIRY_STATUS_LABELS } from "@/lib/constants";
import { db } from "@/lib/db";
import { telHref } from "@/lib/settings";

export const metadata = { title: "Enquiry" };

const fmt = new Intl.DateTimeFormat("en-GB", { dateStyle: "long", timeStyle: "short", timeZone: "Asia/Dhaka" });

export default async function EnquiryPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  const { id } = await params;
  const [enquiry, users, history] = await Promise.all([
    db.enquiry.findUnique({
      where: { id },
      include: { notes: { orderBy: { createdAt: "asc" }, include: { author: { select: { id: true, name: true } } } } },
    }),
    db.user.findMany({ where: { active: true }, select: { id: true, name: true }, orderBy: { name: "asc" } }),
    db.activityLog.findMany({ where: { entity: "enquiry", entityId: id }, orderBy: { createdAt: "desc" }, take: 20, include: { user: { select: { name: true } } } }),
  ]);
  if (!enquiry) notFound();

  const notify = { SENT: "Notification email sent", FAILED: "Notification email failed to send", SKIPPED: "Email not configured, no notification sent" }[enquiry.notifyState];

  return (
    <>
      <p className="mb-4 text-sm">
        <Link className="a-link" href="/admin/enquiries">
          All enquiries
        </Link>
      </p>
      <PageHeader title={enquiry.name} intro={`${enquiry.eventType}, received ${fmt.format(enquiry.createdAt)}`} />

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
        <div className="grid content-start gap-6">
          <section className="a-card p-5" aria-labelledby="details">
            <h2 id="details" className="text-lg font-bold">
              Details
            </h2>
            <dl className="mt-4 grid gap-x-6 gap-y-3 sm:grid-cols-[160px_minmax(0,1fr)]">
              <dt className="text-sm text-muted">Email</dt>
              <dd>
                <a className="a-link" href={`mailto:${enquiry.email}`}>
                  {enquiry.email}
                </a>
              </dd>
              <dt className="text-sm text-muted">Telephone</dt>
              <dd>
                <a className="a-link" href={telHref(enquiry.phone)}>
                  {enquiry.phone}
                </a>
              </dd>
              <dt className="text-sm text-muted">Event type</dt>
              <dd>{enquiry.eventType}</dd>
              <dt className="text-sm text-muted">Expected date</dt>
              <dd>{enquiry.eventDate || "Not given"}</dd>
              <dt className="text-sm text-muted">Venue or city</dt>
              <dd>{enquiry.venue}</dd>
              <dt className="text-sm text-muted">Attendance</dt>
              <dd>{enquiry.scale || "Not given"}</dd>
              <dt className="text-sm text-muted">Notification</dt>
              <dd className="text-sm">{notify}</dd>
            </dl>
            <h3 className="mt-6 text-sm font-semibold text-muted">Project brief</h3>
            <p className="mt-2 whitespace-pre-wrap">{enquiry.message}</p>
          </section>

          <section className="a-card p-5" aria-labelledby="notes">
            <h2 id="notes" className="text-lg font-bold">
              Internal notes
            </h2>
            <p className="text-sm text-muted">Only signed-in staff can see these. They are never shown on the website.</p>
            {enquiry.notes.length === 0 ? <p className="mt-4 text-muted">No notes yet.</p> : null}
            <ul className="mt-4 grid gap-4">
              {enquiry.notes.map((n) => (
                <li key={n.id} className="rounded-md border border-line p-4">
                  <p className="text-xs text-muted">
                    {n.author?.name ?? "Former user"}, {fmt.format(n.createdAt)}
                    {n.updatedAt.getTime() - n.createdAt.getTime() > 1000 ? ", edited" : ""}
                  </p>
                  {n.authorId === user.id || user.role === "ADMIN" ? (
                    <details className="mt-2">
                      <summary className="cursor-pointer whitespace-pre-wrap">{n.body}</summary>
                      <ActionForm action={editNote.bind(null, n.id)} className="mt-3 grid gap-3">
                        <Field name="body" label="Edit note" multiline defaultValue={n.body} required />
                        <div>
                          <Submit className="a-btn a-btn--quiet a-btn--sm">Save note</Submit>
                        </div>
                      </ActionForm>
                    </details>
                  ) : (
                    <p className="mt-2 whitespace-pre-wrap">{n.body}</p>
                  )}
                </li>
              ))}
            </ul>
            <ActionForm action={addNote.bind(null, enquiry.id)} className="mt-6 grid gap-3" resetOnSuccess>
              <Field name="body" label="Add a note" multiline rows={3} required hint="Calls made, quotes sent, next steps." />
              <div>
                <Submit>Add note</Submit>
              </div>
            </ActionForm>
          </section>
        </div>

        <div className="grid content-start gap-6">
          <section className="a-card p-5" aria-labelledby="workflow">
            <h2 id="workflow" className="text-lg font-bold">
              Status and owner
            </h2>
            <ActionForm action={updateEnquiry.bind(null, enquiry.id)} className="mt-4 grid gap-4">
              <SelectField
                name="status"
                label="Status"
                defaultValue={enquiry.status}
                options={ENQUIRY_STATUSES.map((s) => ({ value: s, label: ENQUIRY_STATUS_LABELS[s] }))}
              />
              <SelectField
                name="assigneeId"
                label="Assigned to"
                defaultValue={enquiry.assigneeId ?? ""}
                options={[{ value: "", label: "Nobody yet" }, ...users.map((u) => ({ value: u.id, label: u.name }))]}
              />
              <div>
                <Submit>Save</Submit>
              </div>
            </ActionForm>
          </section>
          <section className="a-card p-5" aria-labelledby="history">
            <h2 id="history" className="text-lg font-bold">
              History
            </h2>
            {history.length === 0 ? (
              <p className="mt-4 text-sm text-muted">No changes yet.</p>
            ) : (
              <ul className="mt-4 grid gap-3 text-sm">
                {history.map((h) => (
                  <li key={h.id}>
                    <p>{h.summary}</p>
                    <p className="text-xs text-muted">
                      {h.user?.name ?? "System"}, {fmt.format(h.createdAt)}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      </div>
    </>
  );
}
