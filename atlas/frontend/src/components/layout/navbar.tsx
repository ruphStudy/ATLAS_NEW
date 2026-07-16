'use client';

import { useState } from 'react';
import { Bell, Search, Command, Plus } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { ThemeToggle } from './theme-toggle';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';

export function Navbar() {
  const [searchOpen, setSearchOpen] = useState(false);

  return (
    <header className="flex h-16 shrink-0 items-center gap-4 border-b border-border bg-background px-6">
      {/* ── Page Context / Breadcrumb ─────────────────────────── */}
      <div className="flex-1 min-w-0">
        <h2 className="text-sm font-semibold text-foreground">Dashboard</h2>
        <p className="text-xs text-muted-foreground">Sunday, July 13, 2026</p>
      </div>

      {/* ── Actions ──────────────────────────────────────────── */}
      <div className="flex items-center gap-2">
        {/* Search Trigger */}
        <button
          onClick={() => setSearchOpen(true)}
          className={cn(
            'hidden md:flex items-center gap-2 rounded-[var(--radius)]',
            'h-9 px-3 text-sm text-muted-foreground',
            'border border-border bg-muted/50',
            'hover:bg-secondary hover:text-foreground transition-colors',
            'w-52',
          )}
        >
          <Search className="h-3.5 w-3.5 shrink-0" />
          <span className="flex-1 text-left">Search...</span>
          <kbd className="flex items-center gap-0.5 rounded border border-border px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
            <Command className="h-2.5 w-2.5" />
            <span>K</span>
          </kbd>
        </button>

        {/* Quick Add */}
        <button className="flex h-9 w-9 items-center justify-center rounded-[var(--radius)] bg-gradient-brand text-white shadow-sm hover:opacity-90 hover:shadow-glow transition-all">
          <Plus className="h-4 w-4" />
        </button>

        {/* Notifications */}
        <div className="relative">
          <button className="flex h-9 w-9 items-center justify-center rounded-[var(--radius)] text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors">
            <Bell className="h-4 w-4" />
          </button>
          <span className="absolute right-1.5 top-1.5 flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-danger opacity-75" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-danger" />
          </span>
        </div>

        {/* Theme Toggle */}
        <ThemeToggle />

        {/* User Menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex items-center gap-2 rounded-[var(--radius)] px-2 py-1.5 text-sm hover:bg-secondary transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
              <Avatar className="h-7 w-7">
                <AvatarFallback className="text-[10px]">JD</AvatarFallback>
              </Avatar>
              <div className="hidden md:block text-left">
                <p className="text-xs font-semibold text-foreground leading-none">John Doe</p>
                <p className="text-[11px] text-muted-foreground leading-none mt-0.5">Admin</p>
              </div>
            </button>
          </DropdownMenuTrigger>

          <DropdownMenuContent align="end" className="w-52">
            <DropdownMenuLabel>My Account</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem>Profile</DropdownMenuItem>
            <DropdownMenuItem>Workspace Settings</DropdownMenuItem>
            <DropdownMenuItem>Billing</DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem destructive>Sign out</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* ── Search Modal Overlay ─────────────────────────────── */}
      <AnimatePresence>
        {searchOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 bg-background/60 backdrop-blur-sm"
              onClick={() => setSearchOpen(false)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: -8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: -8 }}
              transition={{ duration: 0.15 }}
              className={cn(
                'fixed left-1/2 top-24 z-50 w-full max-w-lg -translate-x-1/2',
                'overflow-hidden rounded-[var(--radius)] border border-border',
                'bg-popover shadow-card-hover',
              )}
            >
              <div className="flex items-center gap-3 border-b border-border px-4 py-3">
                <Search className="h-4 w-4 text-muted-foreground shrink-0" />
                <input
                  autoFocus
                  placeholder="Search products, suppliers, orders..."
                  className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground outline-none"
                  onKeyDown={(e) => e.key === 'Escape' && setSearchOpen(false)}
                />
                <kbd className="text-xs text-muted-foreground border border-border rounded px-1.5 py-0.5">
                  ESC
                </kbd>
              </div>
              <div className="p-3">
                <p className="text-xs text-muted-foreground px-2 py-1.5">
                  Start typing to search across your workspace...
                </p>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </header>
  );
}
