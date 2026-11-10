import Link from "next/link";
import { moveProject, setProjectStatus } from "@/app/admin/actions/projects";
import { ActionButton } from "@/components/admin/Form";
import { Notice, PageHeader } from "@/components/admin/PageHeader";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";

export const metadata = { title: "Projects" };

const STATUS_LABEL: Record<string, string> = { DRAFT: "Draft", PUBLISHED: "Published", ARCHIVED: "Archived" };

export default async function ProjectsPage({ searchParams }: { searchParams: Promise<{ show?: string; deleted?: string }> }) {
  await requireUser();
  const { show, deleted } = await searchParams;
  const showArchived = show === "archived";
  const projects = await db.project.findMany({
    where: showArchived ? { status: "ARCHIVED" } : { status: { not: "ARCHIVED" } },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
    include: { images: { select: { id: true, url: true, status: true } } },
  });

  return (
    <>
      <PageHeader
        title="Projects"
        intro="The portfolio shown in the Work section. Featured projects are shown first; the rest follow this order."
        actions={
          <>
            <Link className="a-btn a-btn--quiet" href={showArchived ? "/admin/projects" : "/admin/projects?show=archived"}>
              {showArchived ? "Show current projects" : "Show archived"}
            </Link>
            <Link className="a-btn" href="/admin/projects/new">
              Add a project
            </Link>
          </>
        }
      />
      {deleted ? <Notice>Project deleted.</Notice> : null}
      {projects.length === 0 ? (
        <div className="a-card p-8 text-center">
          <p className="font-semibold">{showArchived ? "Nothing is archived." : "No projects yet."}</p>
          {!showArchived ? (
            <Link className="a-btn mt-4" href="/admin/projects/new">
              Add the first project
            </Link>
          ) : null}
        </div>
      ) : (
        <div className="a-card overflow-x-auto">
          <table className="a-table min-w-[820px]">
            <thead>
              <tr>
                <th scope="col">Order</th>
                <th scope="col">Project</th>
                <th scope="col">Category</th>
                <th scope="col">Photographs</th>
                <th scope="col">Status</th>
                <th scope="col">
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {projects.map((p, i) => {
                const cover = p.images.find((im) => im.id === p.coverImageId) ?? p.images[0];
                const live = p.images.filter((im) => im.status === "PUBLISHED").length;
                return (
                  <tr key={p.id}>
                    <td className="whitespace-nowrap">
                      <div className="flex gap-1">
                        <ActionButton action={moveProject.bind(null, p.id, "up")} label={`Move ${p.title} up`}>
                          <span aria-hidden="true">Up</span>
                        </ActionButton>
                        <ActionButton action={moveProject.bind(null, p.id, "down")} label={`Move ${p.title} down`}>
                          <span aria-hidden="true">Down</span>
                        </ActionButton>
                      </div>
                      <span className="sr-only">Position {i + 1}</span>
                    </td>
                    <td>
                      <div className="flex items-center gap-3">
                        {cover ? <img src={cover.url} alt="" width={72} height={48} className="h-12 w-[72px] rounded object-cover" /> : <span className="h-12 w-[72px] rounded bg-sunk" />}
                        <div>
                          <Link href={`/admin/projects/${p.id}`} className="a-link">
                            {p.title}
                          </Link>
                          <p className="text-sm text-muted">
                            {p.year ?? "No year"}
                            {p.featured ? ", featured" : ""}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="text-sm">{p.category}</td>
                    <td className="text-sm tabular-nums">
                      {live} shown{p.images.length > live ? `, ${p.images.length - live} archived` : ""}
                    </td>
                    <td>
                      <span className={`a-badge ${p.status === "PUBLISHED" ? "a-badge--ok" : p.status === "DRAFT" ? "a-badge--warn" : ""}`}>{STATUS_LABEL[p.status]}</span>
                    </td>
                    <td className="whitespace-nowrap text-right">
                      <div className="flex justify-end gap-1">
                        {p.status !== "PUBLISHED" ? (
                          <ActionButton action={setProjectStatus.bind(null, p.id, "PUBLISHED")}>Publish</ActionButton>
                        ) : (
                          <ActionButton action={setProjectStatus.bind(null, p.id, "DRAFT")}>Unpublish</ActionButton>
                        )}
                        {p.status !== "ARCHIVED" ? (
                          <ActionButton action={setProjectStatus.bind(null, p.id, "ARCHIVED")} confirm={`Archive "${p.title}"? It leaves the website but is kept here.`}>
                            Archive
                          </ActionButton>
                        ) : null}
                        <Link className="a-btn a-btn--quiet a-btn--sm" href={`/admin/projects/${p.id}`}>
                          Edit
                        </Link>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
