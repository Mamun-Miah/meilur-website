import Link from "next/link";
import { Notice, PageHeader } from "@/components/admin/PageHeader";
import { requireUser } from "@/lib/auth";
import { ENQUIRY_STATUSES, ENQUIRY_STATUS_LABELS } from "@/lib/constants";
import { db } from "@/lib/db";
import { mailConfigured } from "@/lib/mailer";
import { cloudinaryConfigured } from "@/lib/storage";

export const metadata = { title: "Dashboard" };

const fmt = new Intl.DateTimeFormat("en-GB", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Dhaka" });

export default async function Dashboard({ searchParams }: { searchParams: Promise<{ denied?: string }> }) {
  const user = await requireUser();
  const { denied } = await searchParams;
  const [totalProjects, publishedProjects, totalEnquiries, byStatus, recentEnquiries, recentActivity] = await Promise.all([
    db.project.count({ where: { status: { not: "ARCHIVED" } } }),
    db.project.count({ where: { status: "PUBLISHED" } }),
    db.enquiry.count(),
    db.enquiry.groupBy({ by: ["status"], _count: { _all: true } }),
    db.enquiry.findMany({ orderBy: { createdAt: "desc" }, take: 5, select: { id: true, name: true, eventType: true, status: true, createdAt: true } }),
    db.activityLog.findMany({
      where: { action: { notIn: ["login", "logout"] } },
      orderBy: { createdAt: "desc" },
      take: 8,
      select: { id: true, summary: true, createdAt: true, user: { select: { name: true } } },
    }),
  ]);
  const count = (s: string) => byStatus.find((b) => b.status === s)?._count._all ?? 0;

  const figures = [
    { label: "Projects", value: totalProjects, hint: "not counting archived", href: "/admin/projects" },
    { label: "Published projects", value: publishedProjects, hint: "visible on the website", href: "/admin/projects" },
    { label: "Enquiries", value: totalEnquiries, hint: "all time", href: "/admin/enquiries" },
    { label: "New enquiries", value: count("NEW"), hint: "waiting for a reply", href: "/admin/enquiries?status=NEW" },
  ];

  return (
    <>
      <PageHeader title={`Hello, ${user.name.split(" ")[0]}`} intro="What is happening on the website today." />
      {denied ? <Notice tone="warn">That page is for admins only. Ask an admin if you need access.</Notice> : null}
      {!mailConfigured() ? (
        <Notice tone="warn">
          Email notifications are not set up yet, so new enquiries are only visible here. Add RESEND_API_KEY or SMTP settings to the server environment.
        </Notice>
      ) : null}
      

      <section aria-label="Figures" className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {figures.map((f) => (
          <Link key={f.label} href={f.href} className="a-card block p-5 no-underline hover:border-line-strong focus-visible:outline-2">
            <p className="text-sm font-semibold text-muted">{f.label}</p>
            <p className="mt-2 text-4xl font-bold tabular-nums">{f.value}</p>
            <p className="mt-1 text-sm text-muted">{f.hint}</p>
          </Link>
        ))}
      </section>

      <div className="mt-8 grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <section className="a-card p-5" aria-labelledby="by-status">
          <h2 id="by-status" className="text-lg font-bold">
            Enquiries by status
          </h2>
          <ul className="mt-4 grid gap-2">
            {ENQUIRY_STATUSES.map((s) => {
              const n = count(s);
              const pct = totalEnquiries ? Math.round((n / totalEnquiries) * 100) : 0;
              return (
                <li key={s}>
                  <Link href={`/admin/enquiries?status=${s}`} className="grid grid-cols-[120px_minmax(0,1fr)_40px] items-center gap-3 rounded-md px-1 py-1 hover:bg-sunk">
                    <span className="text-sm font-semibold">{ENQUIRY_STATUS_LABELS[s]}</span>
                    <span className="h-2 rounded-full bg-sunk" aria-hidden="true">
                      <span className="block h-2 rounded-full bg-accent" style={{ width: `${pct}%` }} />
                    </span>
                    <span className="text-right text-sm tabular-nums">{n}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>

        <section className="a-card p-5" aria-labelledby="quick">
          <h2 id="quick" className="text-lg font-bold">
            Quick actions
          </h2>
          <div className="mt-4 flex flex-wrap gap-2">
            <Link className="a-btn" href="/admin/enquiries?status=NEW">
              Reply to new enquiries
            </Link>
            <Link className="a-btn a-btn--quiet" href="/admin/projects/new">
              Add a project
            </Link>
            <Link className="a-btn a-btn--quiet" href="/admin/team/new">
              Add a team member
            </Link>
            {user.role === "ADMIN" ? (
              <Link className="a-btn a-btn--quiet" href="/admin/settings">
                Change theme or contact details
              </Link>
            ) : null}
          </div>
        </section>

        <section className="a-card p-5" aria-labelledby="latest">
          <h2 id="latest" className="text-lg font-bold">
            Latest enquiries
          </h2>
          {recentEnquiries.length === 0 ? (
            <p className="mt-4 text-muted">No enquiries yet. They appear here as soon as someone sends the contact form.</p>
          ) : (
            <ul className="mt-4 divide-y divide-line">
              {recentEnquiries.map((e) => (
                <li key={e.id} className="flex items-start justify-between gap-3 py-3">
                  <div className="min-w-0">
                    <Link className="a-link" href={`/admin/enquiries/${e.id}`}>
                      {e.name}
                    </Link>
                    <p className="text-sm text-muted">{e.eventType}</p>
                  </div>
                  <div className="text-right">
                    <span className={`a-badge ${e.status === "NEW" ? "a-badge--accent" : ""}`}>{ENQUIRY_STATUS_LABELS[e.status as keyof typeof ENQUIRY_STATUS_LABELS]}</span>
                    <p className="mt-1 text-xs text-muted">{fmt.format(e.createdAt)}</p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="a-card p-5" aria-labelledby="recent">
          <h2 id="recent" className="text-lg font-bold">
            Recently updated
          </h2>
          {recentActivity.length === 0 ? (
            <p className="mt-4 text-muted">No changes yet.</p>
          ) : (
            <ul className="mt-4 divide-y divide-line">
              {recentActivity.map((a) => (
                <li key={a.id} className="py-3 text-sm">
                  <p>{a.summary}</p>
                  <p className="text-xs text-muted">
                    {a.user?.name ?? "System"}, {fmt.format(a.createdAt)}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </>
  );
}
