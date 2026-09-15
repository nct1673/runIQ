import type { Metadata } from "next";
import { Inter } from "next/font/google";
import type { ReactNode } from "react";

import Sidebar from "@/components/Sidebar";

import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

export const metadata: Metadata = {
  title: "RunIQ",
  description: "Personal running intelligence platform",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className={inter.variable}>
      <body className="font-sans">
        <div className="flex min-h-screen bg-bg">
          <Sidebar />
          <main className="flex-1 overflow-y-auto p-6 lg:p-8">{children}</main>
        </div>
      </body>
    </html>
  );
}
