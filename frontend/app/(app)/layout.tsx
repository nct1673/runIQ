import type { ReactNode } from "react";

import Sidebar from "@/components/Sidebar";

/** Shell for every authenticated page: sidebar + scrollable content
 * area. Route-group layout (no URL segment) so /login can sit outside
 * it at app/login/, sidebar-free. */
export default function AppLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen bg-bg">
      <Sidebar />
      <main className="flex-1 overflow-y-auto p-6 lg:p-8">{children}</main>
    </div>
  );
}
