"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import type { ComponentType } from "react";

import {
  ActivityListIcon,
  BarChartIcon,
  CalendarIcon,
  ChatIcon,
  HomeIcon,
  LogoutIcon,
  RefreshIcon,
  SettingsIcon,
  TrendingUpIcon,
} from "@/components/icons";

const NAV_ITEMS: { href: string; label: string; icon: ComponentType<{ className?: string }> }[] = [
  { href: "/dashboard", label: "Dashboard", icon: HomeIcon },
  { href: "/activities", label: "Activities", icon: ActivityListIcon },
  { href: "/activities/upload", label: "Update Data", icon: RefreshIcon },
  { href: "/analytics", label: "Analytics", icon: BarChartIcon },
  { href: "/predictions", label: "Predictions", icon: TrendingUpIcon },
  { href: "/goals", label: "Goals", icon: CalendarIcon },
  { href: "/coach", label: "Coach", icon: ChatIcon },
];

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
  }

  return (
    <aside className="flex h-screen w-[76px] shrink-0 flex-col items-center justify-between border-r border-border bg-surface/60 py-5">
      <div className="flex flex-col items-center gap-6">
        <Link
          href="/dashboard"
          aria-label="RunIQ home"
          className="flex h-11 w-11 items-center justify-center rounded-full bg-brand text-sm font-bold text-white"
        >
          RQ
        </Link>

        <nav className="flex flex-col items-center gap-2">
          {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
            const active = pathname === href;
            return (
              <Link
                key={href}
                href={href}
                title={label}
                aria-label={label}
                aria-current={active ? "page" : undefined}
                className={
                  "flex h-11 w-11 items-center justify-center rounded-2xl transition-colors " +
                  (active
                    ? "bg-brand text-white"
                    : "text-text-muted hover:bg-surface-hover hover:text-text")
                }
              >
                <Icon className="h-5 w-5" />
              </Link>
            );
          })}
        </nav>
      </div>

      <div className="flex flex-col items-center gap-3">
        <button
          type="button"
          aria-label="Log out"
          title="Log out"
          onClick={handleLogout}
          className="flex h-10 w-10 items-center justify-center rounded-full bg-surface text-text-muted hover:text-text"
        >
          <LogoutIcon className="h-5 w-5" />
        </button>
        <button
          type="button"
          aria-label="Settings"
          className="flex h-10 w-10 items-center justify-center rounded-full text-text-muted hover:bg-surface-hover hover:text-text"
        >
          <SettingsIcon className="h-5 w-5" />
        </button>
      </div>
    </aside>
  );
}
