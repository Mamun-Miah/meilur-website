export function PageHeader({ title, intro, actions }: { title: string; intro?: string; actions?: React.ReactNode }) {
  return (
    <header className="mb-8 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">{title}</h1>
        {intro ? <p className="mt-1 max-w-2xl text-muted">{intro}</p> : null}
      </div>
      {actions ? <div className="flex flex-wrap gap-2">{actions}</div> : null}
    </header>
  );
}

export function Notice({ tone = "ok", children }: { tone?: "ok" | "warn" | "bad"; children: React.ReactNode }) {
  const cls = { ok: "border-ok bg-ok-soft text-ok", warn: "border-warn bg-warn-soft text-warn", bad: "border-bad bg-bad-soft text-bad" }[tone];
  return <p role="status" className={`mb-6 rounded-md border px-4 py-3 text-sm font-semibold ${cls}`}>{children}</p>;
}
