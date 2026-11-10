"use client";

import { createContext, useActionState, useContext, useEffect, useId, useRef, type ReactNode } from "react";
import { useFormStatus } from "react-dom";

export type ActionState = { ok?: boolean; message?: string; errors?: Record<string, string>; at?: number };
type Action = (state: ActionState, form: FormData) => Promise<ActionState>;

const StateContext = createContext<ActionState>({});

/** A form bound to a server action, with an announced result and per-field errors. */
export function ActionForm({
  action,
  children,
  className = "",
  resetOnSuccess = false,
}: {
  action: Action;
  children: ReactNode;
  className?: string;
  resetOnSuccess?: boolean;
}) {
  const [state, formAction] = useActionState(action, {});
  const ref = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (state.ok && resetOnSuccess) ref.current?.reset();
  }, [state, resetOnSuccess]);
  return (
    <StateContext.Provider value={state}>
      <form ref={ref} action={formAction} className={className} noValidate>
        {children}
        <FormMessage />
      </form>
    </StateContext.Provider>
  );
}

export function FormMessage() {
  const state = useContext(StateContext);
  if (!state.message) return null;
  return (
    <p
      key={state.at}
      role={state.ok ? "status" : "alert"}
      className={`mt-4 rounded-md border px-4 py-3 text-sm font-semibold ${
        state.ok ? "border-ok bg-ok-soft text-ok" : "border-bad bg-bad-soft text-bad"
      }`}
    >
      {state.message}
    </p>
  );
}

export function Submit({ children, className = "a-btn", pendingText = "Saving" }: { children: ReactNode; className?: string; pendingText?: string }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className={className} disabled={pending} aria-busy={pending}>
      {pending ? pendingText : children}
    </button>
  );
}

type FieldProps = {
  name: string;
  label: string;
  hint?: string;
  defaultValue?: string | number | null;
  type?: string;
  required?: boolean;
  multiline?: boolean;
  rows?: number;
  maxLength?: number;
  placeholder?: string;
  list?: string;
  className?: string;
  accept?: string;
  multiple?: boolean;
  autoComplete?: string;
};

export function Field({ name, label, hint, defaultValue, type = "text", required, multiline, rows = 4, className = "", ...rest }: FieldProps) {
  const state = useContext(StateContext);
  const id = useId();
  const error = state.errors?.[name];
  const describedBy = [hint ? `${id}-hint` : null, error ? `${id}-err` : null].filter(Boolean).join(" ") || undefined;
  const common = {
    id,
    name,
    required,
    "aria-invalid": error ? true : undefined,
    "aria-describedby": describedBy,
    className: "a-input",
    defaultValue: type === "file" ? undefined : (defaultValue ?? undefined) as string | undefined,
    ...rest,
  };
  return (
    <div className={`grid gap-1.5 ${className}`}>
      <label htmlFor={id} className="text-sm font-semibold">
        {label}
        {required ? null : <span className="font-normal text-muted"> (optional)</span>}
      </label>
      {multiline ? <textarea rows={rows} {...common} /> : <input type={type} {...common} />}
      {hint ? (
        <p id={`${id}-hint`} className="text-sm text-muted">
          {hint}
        </p>
      ) : null}
      {error ? (
        <p id={`${id}-err`} className="text-sm font-semibold text-bad">
          {error}
        </p>
      ) : null}
    </div>
  );
}

export function SelectField({
  name,
  label,
  options,
  defaultValue,
  hint,
  className = "",
}: {
  name: string;
  label: string;
  options: { value: string; label: string }[];
  defaultValue?: string | null;
  hint?: string;
  className?: string;
}) {
  const state = useContext(StateContext);
  const id = useId();
  const error = state.errors?.[name];
  return (
    <div className={`grid gap-1.5 ${className}`}>
      <label htmlFor={id} className="text-sm font-semibold">
        {label}
      </label>
      <select id={id} name={name} defaultValue={defaultValue ?? ""} className="a-input" aria-invalid={error ? true : undefined}>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      {hint ? <p className="text-sm text-muted">{hint}</p> : null}
      {error ? <p className="text-sm font-semibold text-bad">{error}</p> : null}
    </div>
  );
}

export function Check({ name, label, defaultChecked, hint }: { name: string; label: string; defaultChecked?: boolean; hint?: string }) {
  const id = useId();
  return (
    <div className="flex items-start gap-3">
      <input id={id} type="checkbox" name={name} defaultChecked={defaultChecked} className="mt-1 size-4 accent-ink" />
      <div>
        <label htmlFor={id} className="text-sm font-semibold">
          {label}
        </label>
        {hint ? <p className="text-sm text-muted">{hint}</p> : null}
      </div>
    </div>
  );
}

/** A one-button form for bound actions (publish, move, delete), with an optional confirmation. */
export function ActionButton({
  action,
  children,
  className = "a-btn a-btn--quiet a-btn--sm",
  confirm,
  label,
}: {
  action: () => Promise<ActionState>;
  children: ReactNode;
  className?: string;
  confirm?: string;
  label?: string;
}) {
  const [state, formAction] = useActionState(async () => action(), {} as ActionState);
  return (
    <form
      action={formAction}
      className="inline"
      onSubmit={(e) => {
        if (confirm && !window.confirm(confirm)) e.preventDefault();
      }}
    >
      <Submit className={className} pendingText="Working">
        {children}
        {label ? <span className="sr-only">{label}</span> : null}
      </Submit>
      {state.message && !state.ok ? (
        <span role="alert" className="ml-2 text-sm font-semibold text-bad">
          {state.message}
        </span>
      ) : null}
    </form>
  );
}
