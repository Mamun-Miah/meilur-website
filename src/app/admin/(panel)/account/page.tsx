import { changeOwnPassword } from "@/app/admin/actions/users";
import { ActionForm, Field, Submit } from "@/components/admin/Form";
import { PageHeader } from "@/components/admin/PageHeader";
import { requireUser } from "@/lib/auth";
import { PASSWORD_RULE } from "@/lib/password";

export const metadata = { title: "My account" };

export default async function AccountPage() {
  const user = await requireUser();
  return (
    <>
      <PageHeader title="My account" intro={`${user.name}, ${user.email}, ${user.role === "ADMIN" ? "admin" : "editor"}.`} />
      <section className="a-card max-w-xl p-6" aria-labelledby="pw">
        <h2 id="pw" className="text-xl font-bold">
          Change password
        </h2>
        <ActionForm action={changeOwnPassword} className="mt-5 grid gap-5" resetOnSuccess>
          <Field name="current" label="Current password" type="password" required autoComplete="current-password" />
          <Field name="password" label="New password" type="password" required autoComplete="new-password" hint={PASSWORD_RULE} />
          <Field name="confirm" label="Repeat the new password" type="password" required autoComplete="new-password" />
          <div>
            <Submit>Change password</Submit>
          </div>
        </ActionForm>
      </section>
    </>
  );
}
