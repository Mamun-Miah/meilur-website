import Link from "next/link";
import { moveMember, toggleMember } from "@/app/admin/actions/content";
import { ActionButton } from "@/components/admin/Form";
import { Notice, PageHeader } from "@/components/admin/PageHeader";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";

export const metadata = { title: "Team" };

export default async function TeamPage({ searchParams }: { searchParams: Promise<{ saved?: string; deleted?: string }> }) {
  await requireUser();
  const { saved, deleted } = await searchParams;
  const members = await db.teamMember.findMany({ orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }] });
  return (
    <>
      <PageHeader
        title="Team"
        intro="People shown in the Team section. Until at least one profile is published, the website shows the team statement from Website settings instead."
        actions={
          <Link className="a-btn" href="/admin/team/new">
            Add a team member
          </Link>
        }
      />
      {saved ? <Notice>Team member saved.</Notice> : null}
      {deleted ? <Notice>Team member removed.</Notice> : null}
      {members.length === 0 ? (
        <div className="a-card p-8 text-center">
          <p className="font-semibold">No team members yet.</p>
          <p className="mt-1 text-muted">Add real, approved profiles: name, job title, a short biography and a portrait.</p>
          <Link className="a-btn mt-4" href="/admin/team/new">
            Add the first profile
          </Link>
        </div>
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {members.map((m) => (
            <li key={m.id} className="a-card p-4">
              <div className="flex gap-3">
                {m.photoUrl ? <img src={m.photoUrl} alt="" width={64} height={80} className="h-20 w-16 rounded object-cover" /> : <span className="h-20 w-16 rounded bg-sunk" />}
                <div className="min-w-0">
                  <Link className="a-link" href={`/admin/team/${m.id}`}>
                    {m.name}
                  </Link>
                  <p className="text-sm text-muted">{m.jobTitle}</p>
                  <span className={`a-badge mt-2 ${m.published ? "a-badge--ok" : "a-badge--warn"}`}>{m.published ? "Published" : "Hidden"}</span>
                </div>
              </div>
              <div className="mt-4 flex flex-wrap gap-1">
                <ActionButton action={moveMember.bind(null, m.id, "up")} label={`Move ${m.name} earlier`}>
                  <span aria-hidden="true">Earlier</span>
                </ActionButton>
                <ActionButton action={moveMember.bind(null, m.id, "down")} label={`Move ${m.name} later`}>
                  <span aria-hidden="true">Later</span>
                </ActionButton>
                <ActionButton action={toggleMember.bind(null, m.id)}>{m.published ? "Hide" : "Publish"}</ActionButton>
              </div>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
