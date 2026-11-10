import { createUser, updateUserAccess } from "@/app/admin/actions/users";
import { ActionForm, Check, Field, SelectField, Submit } from "@/components/admin/Form";
import { PageHeader } from "@/components/admin/PageHeader";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { PASSWORD_RULE } from "@/lib/password";

export const metadata = { title: "Users" };

const fmt = new Intl.DateTimeFormat("en-GB", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Dhaka" });
const ROLE_OPTIONS = [
  { value: "EDITOR", label: "Editor: projects, services, team and enquiries" },
  { value: "ADMIN", label: "Admin: everything, including settings, users and exports" },
];

export default async function UsersPage() {
  const me = await requireUser("ADMIN");
  const users = await db.user.findMany({ orderBy: [{ active: "desc" }, { name: "asc" }] });
  return (
    <>
      <PageHeader title="Users" intro="People who can sign in to this admin panel. Assigned enquiries are matched to these accounts." />
      <ul className="grid gap-4">
        {users.map((u) => (
          <li key={u.id} className="a-card p-5">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="font-semibold">
                  {u.name}
                  {u.id === me.id ? <span className="text-muted"> (you)</span> : null}
                </p>
                <p className="text-sm text-muted">{u.email}</p>
                <p className="mt-1 text-xs text-muted">{u.lastLoginAt ? `Last signed in ${fmt.format(u.lastLoginAt)}` : "Has not signed in yet"}</p>
              </div>
              <ActionForm action={updateUserAccess.bind(null, u.id)} className="flex flex-wrap items-end gap-3">
                <SelectField name="role" label="Role" defaultValue={u.role} options={ROLE_OPTIONS.map((o) => ({ value: o.value, label: o.value === "ADMIN" ? "Admin" : "Editor" }))} />
                <div className="pb-2">
                  <Check name="active" label="Can sign in" defaultChecked={u.active} />
                </div>
                <Submit className="a-btn a-btn--quiet">Save access</Submit>
              </ActionForm>
            </div>
          </li>
        ))}
      </ul>

      <section className="a-card mt-8 p-6" aria-labelledby="new-user">
        <h2 id="new-user" className="text-xl font-bold">
          Add a user
        </h2>
        <p className="mt-1 text-sm text-muted">Choose a temporary password and share it privately. They can change it under My account, or use Forgot password.</p>
        <ActionForm action={createUser} className="mt-5 grid gap-5 sm:grid-cols-2" resetOnSuccess>
          <Field name="name" label="Full name" required maxLength={100} />
          <Field name="email" label="Email" type="email" required autoComplete="off" />
          <SelectField name="role" label="Role" defaultValue="EDITOR" options={ROLE_OPTIONS} />
          <Field name="password" label="Temporary password" type="password" required autoComplete="new-password" hint={PASSWORD_RULE} />
          <div className="sm:col-span-2">
            <Submit>Create account</Submit>
          </div>
        </ActionForm>
      </section>
    </>
  );
}
