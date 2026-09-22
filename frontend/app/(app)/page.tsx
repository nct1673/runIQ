import Link from "next/link";

import Card from "@/components/Card";
import Header from "@/components/Header";
import {
  ActivityListIcon,
  BarChartIcon,
  CalendarIcon,
  ChatIcon,
  HomeIcon,
  TrendingUpIcon,
} from "@/components/icons";

const MODULES = [
  { href: "/dashboard", label: "Dashboard", icon: HomeIcon },
  { href: "/activities", label: "Activities", icon: ActivityListIcon },
  { href: "/analytics", label: "Analytics", icon: BarChartIcon },
  { href: "/predictions", label: "Predictions", icon: TrendingUpIcon },
  { href: "/goals", label: "Goals", icon: CalendarIcon },
  { href: "/coach", label: "AI Coach", icon: ChatIcon },
];

/** Landing page -- links out to the main modules. */
export default function HomePage() {
  return (
    <div>
      <Header title="RunIQ" subtitle="Personal running intelligence platform." />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {MODULES.map(({ href, label, icon: Icon }) => (
          <Link key={href} href={href}>
            <Card className="flex items-center gap-3 transition-colors hover:bg-surface-hover">
              <Icon className="h-5 w-5 text-brand" />
              <span className="text-text">{label}</span>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
