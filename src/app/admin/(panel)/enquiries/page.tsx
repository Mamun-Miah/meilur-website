import Link from "next/link";
import { PageHeader } from "@/components/admin/PageHeader";
import { requireUser } from "@/lib/auth";
import { ENQUIRY_STATUSES, ENQUIRY_STATUS_LABELS, EVENT_TYPES } from "@/lib/constants";
import { db } from "@/lib/db";
import { listEnquiries, parseFilters, statusLabel } from "@/lib/enquiries";

export const metadata = { title: "Enquiries" };

const fmt = new Intl.DateTimeFormat("en-GB", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Dhaka" });

export default async function EnquiriesPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const user = await requireUser();
  const params = await searchParams;
  const filters = parseFilters(params);
  const [rows, users] = await Promise.all([
    listEnquiries(filters),
    db.user.findMany({ where: { active: true }, select: { id: true, name: true }, orderBy: { name: "asc" } }),
  ]);
  const query = new URLSearchParams(Object.entries(filters).filter(([, v]) => v) as [string, string][]).toString();
  const filtered = Object.values(filters).some(Boolean);

  return (
    <>
      <PageHeader
        title="Enquiries"
        intro="Every message sent through the website's contact form."
        actions={
          user.role === "ADMIN" ? (
            <a className="a-btn a-btn--quiet" href={`/api/admin/enquiries/export${query ? `?${query}` : ""}`}>
              Export these to CSV
            </a>
          ) : null
        }
      />

      <form method="get" className="a-card mb-6 grid gap-4 p-4 sm:grid-cols-2 lg:grid-cols-4" role="search" aria-label="Filter enquiries">
        <div className="grid gap-1.5 sm:col-span-2">
          <label htmlFor="q" className="text-sm font-semibold">
            Search
          </label>
          <input id="q" name="q" defaultValue={filters.q} placeholder="Name, email, phone, venue or brief" className="a-input" />
        </div>
        <div className="grid gap-1.5">
          <label htmlFor="status" className="text-sm font-semibold">
            Status
          </label>
          <select id="status" name="status" defaultValue={filters.status ?? ""} className="a-input">
            <option value="">Any status</option>
            {ENQUIRY_STATUSES.map((s) => (
              <option key={s} value={s}>
                {ENQUIRY_STATUS_LABELS[s]}
              </option>
            ))}
          </select>
        </div>
        <div className="grid gap-1.5">
          <label htmlFor="eventType" className="text-sm font-semibold">
            Event type
          </label>
          <select id="eventType" name="eventType" defaultValue={filters.eventType ?? ""} className="a-input">
            <option value="">Any type</option>
            {EVENT_TYPES.map((t) => (
              <option key={t}>{t}</option>
            ))}
          </select>
        </div>
        <div className="grid gap-1.5">
          <label htmlFor="assignee" className="text-sm font-semibold">
            Assigned to
          </label>
          <select id="assignee" name="assignee" defaultValue={filters.assignee ?? ""} className="a-input">
            <option value="">Anyone</option>
            <option value="unassigned">Nobody yet</option>
            {users.map((u) => (
              <option key={u.id} value={u.id}>
                {u.name}
              </option>
            ))}
          </select>
        </div>
        <div className="grid gap-1.5">
          <label htmlFor="from" className="text-sm font-semibold">
            Received from
          </label>
          <input id="from" name="from" type="date" defaultValue={filters.from} className="a-input" />
        </div>
        <div className="grid gap-1.5">
          <label htmlFor="to" className="text-sm font-semibold">
            Received until
          </label>
          <input id="to" name="to" type="date" defaultValue={filters.to} className="a-input" />
        </div>
        <div className="grid gap-1.5">
          <label htmlFor="sort" className="text-sm font-semibold">
            Sort
          </label>
          <select id="sort" name="sort" defaultValue={filters.sort ?? "newest"} className="a-input">
            <option value="newest">Newest first</option>
            <option value="oldest">Oldest first</option>
            <option value="status">By status (new first)</option>
          </select>
        </div>
        <div className="flex flex-wrap items-end gap-2 sm:col-span-2 lg:col-span-4">
          <button type="submit" className="a-btn">
            Apply filters
          </button>
          {filtered ? (
            <Link href="/admin/enquiries" className="a-btn a-btn--quiet">
              Clear
            </Link>
          ) : null}
          <p className="ml-auto text-sm text-muted" role="status">
            {rows.length} {rows.length === 1 ? "enquiry" : "enquiries"}
            {rows.length === 200 ? " (showing the first 200; narrow the filters to see more)" : ""}
          </p>
        </div>
      </form>

      {rows.length === 0 ? (
        <div className="a-card p-8 text-center">
          <p className="font-semibold">{filtered ? "No enquiries match these filters." : "No enquiries yet."}</p>
          <p className="mt-1 text-muted">{filtered ? "Try clearing a filter." : "When someone sends the contact form, it appears here and in your inbox."}</p>
        </div>
      ) : (
        <div className="a-card overflow-x-auto">
          <table className="a-table min-w-[760px]">
            <thead>
              <tr>
                <th scope="col">Received</th>
                <th scope="col">From</th>
                <th scope="col">Event</th>
                <th scope="col">Status</th>
                <th scope="col">Assigned to</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id}>
                  <td className="whitespace-nowrap text-muted">{fmt.format(r.createdAt)}</td>
                  <td>
                    <Link href={`/admin/enquiries/${r.id}`} className="a-link">
                      {r.name}
                    </Link>
                    <p className="text-sm text-muted">{r.email}</p>
                  </td>
                  <td>
                    <p>{r.eventType}</p>
                    <p className="text-sm text-muted">
                      {r.venue}
                      {r.eventDate ? `, ${r.eventDate}` : ""}
                    </p>
                  </td>
                  <td>
                    <span className={`a-badge ${r.status === "NEW" ? "a-badge--accent" : r.status === "WON" ? "a-badge--ok" : r.status === "LOST" ? "a-badge--bad" : ""}`}>
                      {statusLabel(r.status)}
                    </span>
                  </td>
                  <td>{r.assignee?.name ?? <span className="text-muted">Nobody yet</span>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
