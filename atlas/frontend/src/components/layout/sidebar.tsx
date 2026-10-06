'use client';

import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { ChevronLeft, ChevronsUpDown, LogOut, Settings, User as UserIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Tooltip } from '@/components/ui/tooltip';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { useCurrentUser, useLogout } from '@/hooks';
import { useUIStore, useWorkspaceStore } from '@/stores';
import { ROUTES } from '@/constants';
import { SidebarNav } from './sidebar-nav';
import { WorkspaceSwitcher } from './workspace-switcher';

export function Sidebar() {
  const collapsed = useUIStore((s) => s.sidebarCollapsed);
  const toggleSidebar = useUIStore((s) => s.toggleSidebar);
  const user = useCurrentUser();
  const logout = useLogout();
  const router = useRouter();
  const activeWorkspaceId = useWorkspaceStore((s) => s.activeWorkspaceId);

  const fullName = user ? `${user.firstName} ${user.lastName}` : '';
  const initials = user ? `${user.firstName[0] ?? ''}${user.lastName[0] ?? ''}`.toUpperCase() : '';

  return (
    <motion.aside
      animate={{ width: collapsed ? 72 : 260 }}
      transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
      className="relative hidden h-full flex-col overflow-hidden border-r border-sidebar-border bg-sidebar shrink-0 md:flex"
    >
      {/* ── Logo ─────────────────────────────────────────────── */}
      <div className="flex h-16 items-center justify-between px-4 border-b border-sidebar-border shrink-0">
        {!collapsed ? (
          <div className="flex items-center gap-2.5 overflow-hidden">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gradient-brand shadow-sm">
              <span className="text-sm font-bold text-white">A</span>
            </div>
            <span className="text-base font-bold tracking-tight text-foreground whitespace-nowrap">ATLAS</span>
          </div>
        ) : (
          <button
            onClick={toggleSidebar}
            className="mx-auto flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-brand shadow-sm transition-transform hover:scale-105"
            aria-label="Expand sidebar"
          >
            <span className="text-sm font-bold text-white">A</span>
          </button>
        )}

        {!collapsed && (
          <button
            onClick={toggleSidebar}
            className="flex h-7 w-7 items-center justify-center rounded-lg text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors shrink-0"
            aria-label="Collapse sidebar"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* ── Workspace Switcher ────────────────────────────────── */}
      <WorkspaceSwitcher collapsed={collapsed} />

      {/* ── Navigation ───────────────────────────────────────── */}
      <SidebarNav collapsed={collapsed} />

      {/* ── User Profile ─────────────────────────────────────── */}
      <div className="border-t border-sidebar-border p-3 shrink-0">
        <DropdownMenu>
          <Tooltip content={collapsed ? fullName : undefined} side="right">
            <DropdownMenuTrigger asChild>
              <button
                className={cn(
                  'flex w-full items-center gap-2.5 rounded-[var(--radius)] px-2 py-2',
                  'text-sm hover:bg-secondary transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                )}
              >
                <Avatar className="h-7 w-7 shrink-0">
                  <AvatarFallback className="text-[10px]">{initials}</AvatarFallback>
                </Avatar>
                {!collapsed && (
                  <div className="flex flex-1 items-center justify-between overflow-hidden">
                    <div className="min-w-0 text-left">
                      <p className="truncate text-sm font-semibold text-foreground">{fullName}</p>
                      <p className="truncate text-xs capitalize text-muted-foreground">{user?.role.toLowerCase()}</p>
                    </div>
                    <ChevronsUpDown className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                  </div>
                )}
              </button>
            </DropdownMenuTrigger>
          </Tooltip>

          <DropdownMenuContent align="start" side="top" className="w-56">
            <DropdownMenuLabel>{user?.email}</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onSelect={() => router.push(ROUTES.PROFILE)}>
              <UserIcon className="h-4 w-4" />
              Profile
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => activeWorkspaceId && router.push(`${ROUTES.WORKSPACES}/${activeWorkspaceId}`)} disabled={!activeWorkspaceId}>
              <Settings className="h-4 w-4" />
              Workspace settings
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem destructive onSelect={() => logout.mutate()}>
              <LogOut className="h-4 w-4" />
              Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {collapsed && (
          <button
            onClick={toggleSidebar}
            className="mt-2 flex h-7 w-full items-center justify-center rounded-lg text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors"
            aria-label="Expand sidebar"
          >
            <ChevronLeft className="h-3.5 w-3.5 rotate-180" />
          </button>
        )}
      </div>
    </motion.aside>
  );
}
