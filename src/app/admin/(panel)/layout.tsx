import Link from "next/link";
import { logout } from "@/app/admin/actions/auth";
import { SideNav } from "@/components/admin/SideNav";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function PanelLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  const newEnquiries = await db.enquiry.count({ where: { status: "NEW" } });
  const items = [
    { href: "/admin", label: "Dashboard" },
    { href: "/admin/enquiries", label: "Enquiries", badge: newEnquiries },
    { href: "/admin/projects", label: "Projects" },
    { href: "/admin/services", label: "Services" },
    { href: "/admin/team", label: "Team" },
    ...(user.role === "ADMIN"
      ? [
          { href: "/admin/settings", label: "Website settings" },
          { href: "/admin/users", label: "Users" },
          { href: "/admin/activity", label: "Activity log" },
        ]
      : []),
    { href: "/admin/account", label: "My account" },
  ];
  return (
    <div className="min-h-dvh lg:grid lg:grid-cols-[248px_minmax(0,1fr)]">
      <aside className="border-b border-line bg-panel px-4 py-4 lg:sticky lg:top-0 lg:h-dvh lg:border-r lg:border-b-0 lg:px-5 lg:py-6">
        <div className="flex flex-wrap items-center justify-between gap-3 lg:block">
          <Link href="/admin" className="flex items-center gap-2 font-bold">
            <img src="/brand/meilleur-logo.png" alt="" width={56} height={35} className="h-auto w-14" />
            <span>Admin</span>
          </Link>
          <SideNav items={items} />
        </div>
        <div className="mt-8 hidden border-t border-line pt-4 text-sm lg:block">
          <p className="font-semibold">{user.name}</p>
          <p className="text-muted">{user.role === "ADMIN" ? "Admin" : "Editor"}</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <a className="a-btn a-btn--quiet a-btn--sm" href="/" target="_blank" rel="noopener noreferrer">
              View website
            </a>
            <form action={logout}>
              <button className="a-btn a-btn--quiet a-btn--sm" type="submit">
                Sign out
              </button>
            </form>
          </div>
        </div>
      </aside>
      <main id="main" className="min-w-0 px-4 py-8 sm:px-8 lg:px-10">
        <div className="mx-auto max-w-[1200px]">{children}</div>
        <div className="mt-12 flex gap-2 border-t border-line pt-4 lg:hidden">
          <a className="a-btn a-btn--quiet a-btn--sm" href="/" target="_blank" rel="noopener noreferrer">
            View website
          </a>
          <form action={logout}>
            <button className="a-btn a-btn--quiet a-btn--sm" type="submit">
              Sign out
            </button>
          </form>
        </div>
      </main>
    </div>
  );
}
