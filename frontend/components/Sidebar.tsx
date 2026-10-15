"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import type { ComponentType } from "react";

import {
  ActivityListIcon,
  BarChartIcon,
  ChatIcon,
  FlagIcon,
  HomeIcon,
  LogoutIcon,
  UserIcon,
  VideoIcon,
} from "@/components/icons";

const NAV_ITEMS: { href: string; label: string; icon: ComponentType<{ className?: string }> }[] = [
  { href: "/dashboard", label: "Dashboard", icon: HomeIcon },
  { href: "/activities", label: "Activities", icon: ActivityListIcon },
  { href: "/analytics", label: "Analytics", icon: BarChartIcon },
  { href: "/race", label: "Race", icon: FlagIcon },
  { href: "/video-analysis", label: "Video Analysis", icon: VideoIcon },
  { href: "/coach", label: "Coach", icon: ChatIcon },
  { href: "/profile", label: "Profile", icon: UserIcon },
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
          className="flex h-[38px] w-[38px] items-center justify-center rounded-[11px] bg-[linear-gradient(135deg,#a27bff,#ff4d8d_55%,#ffb938)] text-xs font-bold text-white shadow-[0_6px_20px_rgba(255,77,141,0.4)]"
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
                  "flex h-[42px] w-[42px] items-center justify-center rounded-[11px] transition-colors " +
                  (active
                    ? "bg-violet/15 text-[#c9b6ff] shadow-[inset_0_0_0_1px_var(--color-border-strong)]"
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
      </div>
    </aside>
  );
}
