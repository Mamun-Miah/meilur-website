import Link from "next/link";
import { notFound } from "next/navigation";
import { deleteImage, deleteProject, moveImage, saveProject, setCover, updateImage, uploadProjectImages } from "@/app/admin/actions/projects";
import { ActionButton, ActionForm, Field, SelectField, Submit } from "@/components/admin/Form";
import { Notice, PageHeader } from "@/components/admin/PageHeader";
import { ProjectFields } from "@/components/admin/ProjectFields";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { cloudinaryConfigured } from "@/lib/storage";

export const metadata = { title: "Edit project" };

export default async function EditProjectPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ created?: string }> }) {
  const user = await requireUser();
  const { id } = await params;
  const { created } = await searchParams;
  const [project, categoryRows] = await Promise.all([
    db.project.findUnique({ where: { id }, include: { images: { orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }] } } }),
    db.project.findMany({ distinct: ["category"], select: { category: true } }),
  ]);
  if (!project) notFound();
  const categories = categoryRows.map((c) => c.category);
  const coverId = project.coverImageId ?? project.images[0]?.id;

  return (
    <>
      <p className="mb-4 text-sm">
        <Link className="a-link" href="/admin/projects">
          All projects
        </Link>
      </p>
      <PageHeader
        title={project.title}
        intro={project.status === "PUBLISHED" ? "Published: visible in the Work section." : project.status === "DRAFT" ? "Draft: not visible on the website yet." : "Archived: hidden from the website."}
      />
      {created ? <Notice>Project created. Now add its photographs below, then publish it.</Notice> : null}

      <ActionForm action={saveProject.bind(null, project.id)} className="a-card grid gap-6 p-6">
        <h2 className="text-lg font-bold">Details</h2>
        <ProjectFields project={project} categories={categories} />
        <div>
          <Submit>Save details</Submit>
        </div>
      </ActionForm>

      <section className="a-card mt-6 p-6" aria-labelledby="photos">
        <h2 id="photos" className="text-lg font-bold">
          Photographs
        </h2>
        <p className="mt-1 text-sm text-muted">
          The cover appears in the gallery; all published photographs appear when a visitor opens the project. Archived photographs stay here but leave the website.
        </p>

        <ActionForm action={uploadProjectImages.bind(null, project.id)} className="mt-4 grid gap-3 rounded-md border border-dashed border-line-strong p-4" resetOnSuccess>
          <Field
            name="images"
            label="Upload photographs"
            type="file"
            accept="image/jpeg,image/png,image/webp,image/avif"
            multiple
            required
            hint={`JPG, PNG, WebP or AVIF, up to 10 MB each and 12 at a time. They are resized and stored ${cloudinaryConfigured() ? "on Cloudinary" : "on this server"}.`}
          />
          <div>
            <Submit pendingText="Uploading">Upload</Submit>
          </div>
        </ActionForm>

        {project.images.length === 0 ? (
          <p className="mt-6 text-muted">No photographs yet. A project needs at least one published photograph to appear on the website.</p>
        ) : (
          <ol className="mt-6 grid gap-4">
            {project.images.map((img, i) => (
              <li key={img.id} className="grid gap-4 rounded-md border border-line p-4 md:grid-cols-[200px_minmax(0,1fr)]">
                <div>
                  <img src={img.url} alt="" width={200} height={134} className={`aspect-[3/2] w-full rounded object-cover ${img.status === "ARCHIVED" ? "opacity-50" : ""}`} />
                  <div className="mt-2 flex flex-wrap gap-1">
                    {img.id === coverId ? (
                      <span className="a-badge a-badge--accent">Cover</span>
                    ) : (
                      <ActionButton action={setCover.bind(null, img.id)}>Make cover</ActionButton>
                    )}
                    {img.status === "ARCHIVED" ? <span className="a-badge">Archived</span> : null}
                  </div>
                  <div className="mt-2 flex flex-wrap gap-1">
                    <ActionButton action={moveImage.bind(null, img.id, "up")} label={`Move photograph ${i + 1} earlier`}>
                      <span aria-hidden="true">Earlier</span>
                    </ActionButton>
                    <ActionButton action={moveImage.bind(null, img.id, "down")} label={`Move photograph ${i + 1} later`}>
                      <span aria-hidden="true">Later</span>
                    </ActionButton>
                    {user.role === "ADMIN" ? (
                      <ActionButton action={deleteImage.bind(null, img.id)} className="a-btn a-btn--danger a-btn--sm" confirm="Delete this photograph permanently?">
                        Delete
                      </ActionButton>
                    ) : null}
                  </div>
                </div>
                <ActionForm action={updateImage.bind(null, img.id)} className="grid content-start gap-3">
                  <Field name="alt" label="Alt text (describes the photograph)" defaultValue={img.alt} required maxLength={200} />
                  <Field name="caption" label="Caption" defaultValue={img.caption} maxLength={200} />
                  <SelectField
                    name="status"
                    label="Visibility"
                    defaultValue={img.status}
                    options={[
                      { value: "PUBLISHED", label: "Published" },
                      { value: "ARCHIVED", label: "Archived (hidden)" },
                    ]}
                  />
                  <div>
                    <Submit className="a-btn a-btn--quiet">Save photograph</Submit>
                  </div>
                </ActionForm>
              </li>
            ))}
          </ol>
        )}
      </section>

      {user.role === "ADMIN" ? (
        <section className="a-card mt-6 border-bad p-6" aria-labelledby="danger">
          <h2 id="danger" className="text-lg font-bold">
            Delete project
          </h2>
          <p className="mt-1 text-sm text-muted">Archiving keeps the record. Deleting removes the project and all its photographs for good.</p>
          <div className="mt-4">
            <ActionButton action={deleteProject.bind(null, project.id)} className="a-btn a-btn--danger" confirm={`Delete "${project.title}" and all its photographs permanently?`}>
              Delete permanently
            </ActionButton>
          </div>
        </section>
      ) : null}
    </>
  );
}
