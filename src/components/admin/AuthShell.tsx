import Link from "next/link";

/** Sign-in, reset and new-password screens: an ink panel with the mark beside a quiet form. */
export function AuthShell({ title, intro, children }: { title: string; intro?: string; children: React.ReactNode }) {
  return (
    <main className="min-h-dvh lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
      <div className="hidden flex-col justify-between bg-ink p-12 text-panel lg:flex">
        <span className="a-logo h-20 text-panel" role="img" aria-label="MEILLEUR" />
        <div>
          <p className="max-w-md font-display text-5xl leading-tight">Your event, your success, our expertise.</p>
          <p className="mt-6 max-w-sm text-sm opacity-75">Projects, enquiries and website settings for MEILLEUR, Dhaka.</p>
        </div>
      </div>

      <div className="flex min-h-dvh flex-col justify-center px-6 py-12 sm:px-12 lg:px-16">
        <div className="mx-auto w-full max-w-sm">
          <span className="a-logo mb-10 h-12 text-ink lg:hidden" role="img" aria-label="MEILLEUR" />
          <h1 className="font-display text-4xl leading-tight">{title}</h1>
          {intro ? <p className="mt-3 text-muted">{intro}</p> : null}
          <div className="mt-8">{children}</div>
          <p className="mt-12 border-t border-line pt-6 text-sm text-muted">
            <Link className="a-link" href="/">
              Back to the website
            </Link>
          </p>
        </div>
      </div>
    </main>
  );
}
