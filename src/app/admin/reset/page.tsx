import Link from "next/link";
import { resetPassword } from "@/app/admin/actions/auth";
import { AuthShell } from "@/components/admin/AuthShell";
import { ActionForm, Field, Submit } from "@/components/admin/Form";
import { PASSWORD_RULE } from "@/lib/password";

export const metadata = { title: "Choose a new password" };

export default async function ResetPage({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const { token } = await searchParams;
  return (
    <AuthShell title="Choose a new password">
      {token ? (
        <ActionForm action={resetPassword} className="grid gap-4">
          <input type="hidden" name="token" value={token} />
          <Field name="password" label="New password" type="password" autoComplete="new-password" hint={PASSWORD_RULE} required />
          <Field name="confirm" label="Repeat the new password" type="password" autoComplete="new-password" required />
          <Submit>Save new password</Submit>
        </ActionForm>
      ) : (
        <p>This link is incomplete. Ask for a new reset link.</p>
      )}
      <p className="mt-6 text-sm">
        <Link className="a-link" href="/admin/login">
          Back to sign in
        </Link>
      </p>
    </AuthShell>
  );
}
