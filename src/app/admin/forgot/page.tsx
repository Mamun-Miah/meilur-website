import Link from "next/link";
import { requestReset } from "@/app/admin/actions/auth";
import { AuthShell } from "@/components/admin/AuthShell";
import { ActionForm, Field, Submit } from "@/components/admin/Form";

export const metadata = { title: "Reset password" };

export default function ForgotPage() {
  return (
    <AuthShell title="Reset your password" intro="Enter your account email. We will send a link that works for 30 minutes.">
      <ActionForm action={requestReset} className="grid gap-4" resetOnSuccess>
        <Field name="email" label="Email" type="email" autoComplete="username" required />
        <Submit pendingText="Sending">Send reset link</Submit>
      </ActionForm>
      <p className="mt-6 text-sm">
        <Link className="a-link" href="/admin/login">
          Back to sign in
        </Link>
      </p>
    </AuthShell>
  );
}
