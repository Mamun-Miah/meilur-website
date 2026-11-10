import Link from "next/link";
import { saveProject } from "@/app/admin/actions/projects";
import { ActionForm, Submit } from "@/components/admin/Form";
import { PageHeader } from "@/components/admin/PageHeader";
import { ProjectFields } from "@/components/admin/ProjectFields";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";

export const metadata = { title: "New project" };

export default async function NewProjectPage() {
  await requireUser();
  const categories = (await db.project.findMany({ distinct: ["category"], select: { category: true } })).map((c) => c.category);
  return (
    <>
      <p className="mb-4 text-sm">
        <Link className="a-link" href="/admin/projects">
          All projects
        </Link>
      </p>
      <PageHeader title="Add a project" intro="Save the details first; you can add photographs on the next screen." />
      <ActionForm action={saveProject.bind(null, null)} className="a-card grid gap-6 p-6">
        <ProjectFields project={null} categories={categories} />
        <div>
          <Submit>Save and add photographs</Submit>
        </div>
      </ActionForm>
    </>
  );
}
