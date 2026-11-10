import Link from "next/link";
import { notFound } from "next/navigation";
import { deleteService, saveService } from "@/app/admin/actions/content";
import { ActionButton, ActionForm, Check, Field, Submit } from "@/components/admin/Form";
import { PageHeader } from "@/components/admin/PageHeader";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";

export const metadata = { title: "Service" };

export default async function ServicePage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  const { id } = await params;
  const service = id === "new" ? null : await db.service.findUnique({ where: { id } });
  if (id !== "new" && !service) notFound();

  return (
    <>
      <p className="mb-4 text-sm">
        <Link className="a-link" href="/admin/services">
          All services
        </Link>
      </p>
      <PageHeader title={service ? service.title : "Add a service"} />
      <ActionForm action={saveService.bind(null, service?.id ?? null)} className="a-card grid gap-5 p-6">
        <Field name="title" label="Service name" defaultValue={service?.title} required maxLength={80} />
        <Field name="summary" label="Description" defaultValue={service?.summary} required multiline rows={3} maxLength={260} hint="One or two sentences. Keep it scannable." />
        <div className="grid gap-4 sm:grid-cols-[180px_minmax(0,1fr)]">
          {service?.imageUrl ? <img src={service.imageUrl} alt="" width={180} height={135} className="aspect-[4/3] w-full rounded object-cover" /> : <div className="aspect-[4/3] rounded bg-sunk" />}
          <div className="grid content-start gap-4">
            <Field name="image" label={service?.imageUrl ? "Replace image" : "Image"} type="file" accept="image/jpeg,image/png,image/webp,image/avif" hint="Shown when the service is featured. Up to 10 MB." />
            <Field name="imageAlt" label="Image description" defaultValue={service?.imageAlt} maxLength={200} hint="What the photograph shows, for screen readers." />
            {service?.imageUrl ? <Check name="removeImage" label="Remove the current image" /> : null}
          </div>
        </div>
        <Check name="published" label="Show on the website" defaultChecked={service ? service.published : true} />
        <Check name="featured" label="Featured" defaultChecked={service?.featured} hint="Featured services with an image are set larger, with their photograph." />
        <div>
          <Submit>Save service</Submit>
        </div>
      </ActionForm>
      {service && user.role === "ADMIN" ? (
        <div className="mt-6">
          <ActionButton action={deleteService.bind(null, service.id)} className="a-btn a-btn--danger" confirm={`Delete the service "${service.title}"? Hiding it keeps it for later.`}>
            Delete service
          </ActionButton>
        </div>
      ) : null}
    </>
  );
}
