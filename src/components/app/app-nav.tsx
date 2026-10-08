"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { BookIcon, DumbbellIcon, SlidersIcon, TrendingUpIcon } from "@/components/icons";

const links = [
  { href: "/", label: "Today", icon: DumbbellIcon, isActive: (path: string) => path === "/" },
  { href: "/diary", label: "Diary", icon: BookIcon, isActive: (path: string) => path.startsWith("/diary") },
  {
    href: "/insights",
    label: "Insights",
    icon: TrendingUpIcon,
    isActive: (path: string) => path.startsWith("/insights"),
  },
  {
    href: "/settings",
    label: "Settings",
    icon: SlidersIcon,
    isActive: (path: string) => path.startsWith("/settings"),
  },
];

export function AppNav() {
  const pathname = usePathname();

  return (
    <nav aria-label="Main" className="flex items-center gap-0.5 rounded-full bg-muted/70 p-1 sm:gap-1">
      {links.map(({ href, label, icon: Icon, isActive }) => {
        const active = isActive(pathname);
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? "page" : undefined}
            className={`inline-flex h-9 items-center gap-2 rounded-full px-2.5 text-sm font-medium transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent sm:px-4 ${
              active
                ? "bg-card text-foreground shadow-sm ring-1 ring-border"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Icon className="hidden size-4 sm:block" />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
