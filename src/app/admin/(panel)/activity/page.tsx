import { PageHeader } from "@/components/admin/PageHeader";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";

export const metadata = { title: "Activity log" };

const fmt = new Intl.DateTimeFormat("en-GB", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Dhaka" });

export default async function ActivityPage() {
  await requireUser("ADMIN");
  const rows = await db.activityLog.findMany({ orderBy: { createdAt: "desc" }, take: 300, include: { user: { select: { name: true, email: true } } } });
  return (
    <>
      <PageHeader title="Activity log" intro="The last 300 important changes and sign-ins, newest first." />
      {rows.length === 0 ? (
        <p className="a-card p-8 text-center text-muted">Nothing recorded yet.</p>
      ) : (
        <div className="a-card overflow-x-auto">
          <table className="a-table min-w-[700px]">
            <thead>
              <tr>
                <th scope="col">When</th>
                <th scope="col">Who</th>
                <th scope="col">What</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id}>
                  <td className="whitespace-nowrap text-muted">{fmt.format(r.createdAt)}</td>
                  <td className="whitespace-nowrap">{r.user?.name ?? "System"}</td>
                  <td>{r.summary}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
