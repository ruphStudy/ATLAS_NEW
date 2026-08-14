'use client';

import { Sidebar } from './sidebar';
import { Navbar } from './navbar';
import { MobileNav } from './mobile-nav';

interface AppShellProps {
  children: React.ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* ── Sidebar (desktop) ─────────────────────────────────── */}
      <Sidebar />

      {/* ── Sidebar (mobile drawer) ───────────────────────────── */}
      <MobileNav />

      {/* ── Main Area ─────────────────────────────────────────── */}
      <div className="flex flex-1 flex-col overflow-hidden min-w-0">
        <Navbar />

        <main className="flex-1 overflow-y-auto">
          <div className="mx-auto max-w-screen-2xl px-4 py-6 sm:px-6">{children}</div>
        </main>
      </div>
    </div>
  );
}
