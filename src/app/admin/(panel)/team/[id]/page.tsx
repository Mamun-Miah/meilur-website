import Link from "next/link";
import { notFound } from "next/navigation";
import { deleteMember, saveMember } from "@/app/admin/actions/content";
import { ActionButton, ActionForm, Check, Field, Submit } from "@/components/admin/Form";
import { PageHeader } from "@/components/admin/PageHeader";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";

export const metadata = { title: "Team member" };

export default async function MemberPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  const { id } = await params;
  const member = id === "new" ? null : await db.teamMember.findUnique({ where: { id } });
  if (id !== "new" && !member) notFound();

  return (
    <>
      <p className="mb-4 text-sm">
        <Link className="a-link" href="/admin/team">
          All team members
        </Link>
      </p>
      <PageHeader title={member ? member.name : "Add a team member"} intro="Only publish details the person has approved." />
      <ActionForm action={saveMember.bind(null, member?.id ?? null)} className="a-card grid gap-5 p-6 sm:grid-cols-2">
        <Field name="name" label="Full name" defaultValue={member?.name} required maxLength={100} />
        <Field name="jobTitle" label="Job title" defaultValue={member?.jobTitle} required maxLength={100} />
        <Field name="bio" label="Short biography" defaultValue={member?.bio} multiline rows={4} maxLength={400} className="sm:col-span-2" hint="Two or three sentences." />
        <Field name="linkedinUrl" label="LinkedIn profile" type="url" defaultValue={member?.linkedinUrl} maxLength={300} className="sm:col-span-2" hint="The full address, e.g. https://www.linkedin.com/in/name" />
        <div className="grid gap-4 sm:col-span-2 sm:grid-cols-[140px_minmax(0,1fr)]">
          {member?.photoUrl ? <img src={member.photoUrl} alt="" width={140} height={175} className="aspect-[4/5] w-full rounded object-cover" /> : <div className="aspect-[4/5] rounded bg-sunk" />}
          <div className="grid content-start gap-4">
            <Field name="photo" label={member?.photoUrl ? "Replace portrait" : "Portrait"} type="file" accept="image/jpeg,image/png,image/webp,image/avif" hint="A portrait in 4:5 works best. Up to 10 MB." />
            <Field name="photoAlt" label="Portrait description" defaultValue={member?.photoAlt} maxLength={200} hint="Leave empty to use 'Portrait of' and the name." />
            {member?.photoUrl ? <Check name="removePhoto" label="Remove the current portrait" /> : null}
          </div>
        </div>
        <div className="sm:col-span-2">
          <Check name="published" label="Show on the website" defaultChecked={member?.published} />
        </div>
        <div className="sm:col-span-2">
          <Submit>Save team member</Submit>
        </div>
      </ActionForm>
      {member && user.role === "ADMIN" ? (
        <div className="mt-6">
          <ActionButton action={deleteMember.bind(null, member.id)} className="a-btn a-btn--danger" confirm={`Remove ${member.name} permanently?`}>
            Remove team member
          </ActionButton>
        </div>
      ) : null}
    </>
  );
}
