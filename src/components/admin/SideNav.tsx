"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

type Item = { href: string; label: string; badge?: number };

export function SideNav({ items }: { items: Item[] }) {
  const path = usePathname();
  const [open, setOpen] = useState(false);
  const current = (href: string) => (href === "/admin" ? path === "/admin" : path.startsWith(href));
  return (
    <>
      <button
        type="button"
        className="a-btn a-btn--quiet a-btn--sm lg:hidden"
        aria-expanded={open}
        aria-controls="admin-nav"
        onClick={() => setOpen((v) => !v)}
      >
        {open ? "Close menu" : "Menu"}
      </button>
      <nav id="admin-nav" aria-label="Admin" className={`a-nav ${open ? "block" : "hidden"} w-full basis-full mt-2 lg:mt-8 lg:block`}>
        <ul className="grid gap-1">
          {items.map((item) => (
            <li key={item.href}>
              <Link href={item.href} aria-current={current(item.href) ? "page" : undefined} onClick={() => setOpen(false)}>
                <span className="flex-1">{item.label}</span>
                {item.badge ? <span className="a-badge a-badge--accent">{item.badge}<span className="sr-only"> new</span></span> : null}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </>
  );
}
