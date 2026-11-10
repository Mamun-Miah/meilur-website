import Link from "next/link";
import { redirect } from "next/navigation";
import { login } from "@/app/admin/actions/auth";
import { AuthShell } from "@/components/admin/AuthShell";
import { ActionForm, Field, Submit } from "@/components/admin/Form";
import { getCurrentUser } from "@/lib/auth";

export const metadata = { title: "Sign in" };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  if (await getCurrentUser()) redirect("/admin");
  const { next } = await searchParams;
  return (
    <AuthShell title="Sign in" intro="Manage the MEILLEUR website, projects and enquiries.">
      <ActionForm action={login} className="grid gap-4">
        <input type="hidden" name="next" value={next ?? ""} />
        <Field name="email" label="Email" type="email" autoComplete="username" required />
        <Field name="password" label="Password" type="password" autoComplete="current-password" required />
        <Submit pendingText="Signing in">Sign in</Submit>
      </ActionForm>
      <p className="mt-6 text-sm">
        <Link className="a-link" href="/admin/forgot">
          Forgot your password?
        </Link>
      </p>
    </AuthShell>
  );
}
