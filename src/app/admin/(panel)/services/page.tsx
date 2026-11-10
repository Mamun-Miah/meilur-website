import Link from "next/link";
import { moveService, toggleService } from "@/app/admin/actions/content";
import { ActionButton } from "@/components/admin/Form";
import { Notice, PageHeader } from "@/components/admin/PageHeader";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";

export const metadata = { title: "Services" };

export default async function ServicesPage({ searchParams }: { searchParams: Promise<{ saved?: string; deleted?: string }> }) {
  await requireUser();
  const { saved, deleted } = await searchParams;
  const services = await db.service.findMany({ orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }] });
  return (
    <>
      <PageHeader
        title="Services"
        intro="The numbered list in the Services section, in this order. Featured services with an image are shown larger, with their photograph."
        actions={
          <Link className="a-btn" href="/admin/services/new">
            Add a service
          </Link>
        }
      />
      {saved ? <Notice>Service saved.</Notice> : null}
      {deleted ? <Notice>Service deleted.</Notice> : null}
      {services.length === 0 ? (
        <div className="a-card p-8 text-center">
          <p className="font-semibold">No services yet.</p>
        </div>
      ) : (
        <div className="a-card overflow-x-auto">
          <table className="a-table min-w-[760px]">
            <thead>
              <tr>
                <th scope="col">Order</th>
                <th scope="col">Service</th>
                <th scope="col">On the website</th>
                <th scope="col">Featured</th>
                <th scope="col">
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {services.map((s) => (
                <tr key={s.id}>
                  <td className="whitespace-nowrap">
                    <div className="flex gap-1">
                      <ActionButton action={moveService.bind(null, s.id, "up")} label={`Move ${s.title} up`}>
                        <span aria-hidden="true">Up</span>
                      </ActionButton>
                      <ActionButton action={moveService.bind(null, s.id, "down")} label={`Move ${s.title} down`}>
                        <span aria-hidden="true">Down</span>
                      </ActionButton>
                    </div>
                  </td>
                  <td>
                    <Link className="a-link" href={`/admin/services/${s.id}`}>
                      {s.title}
                    </Link>
                    <p className="max-w-xl text-sm text-muted">{s.summary}</p>
                  </td>
                  <td>
                    <ActionButton action={toggleService.bind(null, s.id, "published")} label={`${s.title}: change visibility`}>
                      {s.published ? "Shown" : "Hidden"}
                    </ActionButton>
                  </td>
                  <td>
                    <ActionButton action={toggleService.bind(null, s.id, "featured")} label={`${s.title}: change featured`}>
                      {s.featured ? "Featured" : "Not featured"}
                    </ActionButton>
                    {s.featured && !s.imageUrl ? <p className="mt-1 text-xs text-warn">Add an image to show it large.</p> : null}
                  </td>
                  <td className="text-right">
                    <Link className="a-btn a-btn--quiet a-btn--sm" href={`/admin/services/${s.id}`}>
                      Edit
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
