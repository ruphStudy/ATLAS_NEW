'use client';

import { useState, useEffect } from 'react';
import { Sidebar } from './sidebar';
import { Navbar } from './navbar';

interface AppShellProps {
  children: React.ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  // Persist sidebar state
  useEffect(() => {
    const stored = localStorage.getItem('atlas-sidebar-collapsed');
    if (stored !== null) setSidebarCollapsed(stored === 'true');
  }, []);

  const toggleSidebar = () => {
    setSidebarCollapsed((prev) => {
      const next = !prev;
      localStorage.setItem('atlas-sidebar-collapsed', String(next));
      return next;
    });
  };

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* ── Sidebar ───────────────────────────────────────────── */}
      <Sidebar collapsed={sidebarCollapsed} onToggle={toggleSidebar} />

      {/* ── Main Area ─────────────────────────────────────────── */}
      <div className="flex flex-1 flex-col overflow-hidden min-w-0">
        <Navbar />

        <main className="flex-1 overflow-y-auto">
          <div className="mx-auto max-w-screen-2xl px-6 py-6">{children}</div>
        </main>
      </div>
    </div>
  );
}
