"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Button } from "@heroui/react";

const LINKS = [
  { href: "/invoices", label: "Invoices" },
  { href: "/clients", label: "Clients" },
  { href: "/time", label: "Time" },
];

export function Nav() {
  const pathname = usePathname();
  const isActive = (href: string) => pathname === href || pathname.startsWith(href + "/");

  function linkClass(href: string) {
    const base = "rounded-md px-2 py-1 text-foreground hover:bg-surface-secondary";
    return isActive(href) ? `${base} bg-surface-secondary font-medium` : base;
  }

  return (
    <nav className="mx-auto flex max-w-5xl items-center gap-2 px-4 py-3 text-sm">
      {LINKS.map((l) => (
        <Link key={l.href} href={l.href} className={linkClass(l.href)}>
          {l.label}
        </Link>
      ))}
      <Link href="/settings" className={`ml-auto ${linkClass("/settings")}`}>
        Settings
      </Link>
      <form action="/api/auth/logout" method="post">
        <Button type="submit" variant="ghost" size="sm">
          Sign out
        </Button>
      </form>
    </nav>
  );
}
