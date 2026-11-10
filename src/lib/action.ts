import "server-only";
import { revalidatePath } from "next/cache";
import { isRedirectError } from "next/dist/client/components/redirect-error";
import type { ZodError } from "zod";
import { AuthError } from "./auth";
import { UploadError } from "./storage";

export type ActionState = {
  ok?: boolean;
  message?: string;
  errors?: Record<string, string>;
  /** Changes on every submit so the client can react to repeated identical results. */
  at?: number;
};

export const initialState: ActionState = {};

export function zodErrors(error: ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path.join(".");
    if (!out[key]) out[key] = issue.message;
  }
  return out;
}

export function fail(message: string, errors?: Record<string, string>): ActionState {
  return { ok: false, message, errors, at: Date.now() };
}

export function done(message: string): ActionState {
  return { ok: true, message, at: Date.now() };
}

/** Wraps a server action: maps auth, validation-of-upload and unexpected errors to a readable state. */
export function safeAction<A extends unknown[]>(fn: (...args: A) => Promise<ActionState>) {
  return async (...args: A): Promise<ActionState> => {
    try {
      return await fn(...args);
    } catch (error) {
      if (isRedirectError(error)) throw error;
      if (error instanceof AuthError || error instanceof UploadError) return fail(error.message);
      console.error("[admin action]", error);
      return fail("Something went wrong while saving. Nothing was changed; please try again.");
    }
  };
}

/** Rebuilds the public page so saved content appears immediately. */
export function revalidatePublic() {
  revalidatePath("/", "layout");
}

export function str(form: FormData, key: string): string {
  const v = form.get(key);
  return typeof v === "string" ? v : "";
}

export function bool(form: FormData, key: string): boolean {
  const v = form.get(key);
  return v === "on" || v === "true" || v === "1";
}
