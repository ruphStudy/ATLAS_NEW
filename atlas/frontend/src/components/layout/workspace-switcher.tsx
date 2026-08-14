'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { Check, ChevronsUpDown, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Tooltip } from '@/components/ui/tooltip';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { useMyWorkspaces, useSwitchWorkspace } from '@/hooks';
import { useWorkspaceStore } from '@/stores';

function initialsOf(name: string): string {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join('');
}

export function WorkspaceSwitcher({ collapsed }: { collapsed: boolean }) {
  useMyWorkspaces();
  const workspaces = useWorkspaceStore((s) => s.workspaces);
  const activeWorkspaceId = useWorkspaceStore((s) => s.activeWorkspaceId);
  const switchWorkspace = useSwitchWorkspace();

  const activeWorkspace = workspaces.find((w) => w.id === activeWorkspaceId) ?? workspaces[0];

  if (!activeWorkspace) {
    return (
      <div className="p-3 border-b border-sidebar-border shrink-0">
        <div className="h-10 w-full animate-pulse rounded-[var(--radius)] bg-muted" />
      </div>
    );
  }

  return (
    <div className="p-3 border-b border-sidebar-border shrink-0">
      <DropdownMenu>
        <Tooltip content={collapsed ? activeWorkspace.name : undefined} side="right">
          <DropdownMenuTrigger asChild>
            <button
              className={cn(
                'flex w-full items-center gap-2.5 rounded-[var(--radius)] px-2.5 py-2',
                'text-sm text-foreground hover:bg-secondary transition-colors',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
              )}
            >
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-gradient-brand text-white text-xs font-bold">
                {initialsOf(activeWorkspace.name)}
              </div>
              <AnimatePresence>
                {!collapsed && (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex flex-1 items-center justify-between overflow-hidden">
                    <div className="min-w-0 text-left">
                      <p className="truncate text-sm font-semibold text-foreground">{activeWorkspace.name}</p>
                      <p className="text-xs capitalize text-muted-foreground">{activeWorkspace.plan.toLowerCase()}</p>
                    </div>
                    <ChevronsUpDown className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                  </motion.div>
                )}
              </AnimatePresence>
            </button>
          </DropdownMenuTrigger>
        </Tooltip>

        <DropdownMenuContent align="start" className="w-64">
          <DropdownMenuLabel>Switch workspace</DropdownMenuLabel>
          <DropdownMenuSeparator />
          {workspaces.map((ws) => (
            <DropdownMenuItem key={ws.id} onSelect={() => ws.id !== activeWorkspace.id && switchWorkspace.mutate(ws.id)} disabled={switchWorkspace.isPending}>
              <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded bg-gradient-brand text-[10px] font-bold text-white">{initialsOf(ws.name)}</div>
              <span className="flex-1 truncate">{ws.name}</span>
              {ws.id === activeWorkspace.id && <Check className="h-3.5 w-3.5 shrink-0 text-primary" />}
            </DropdownMenuItem>
          ))}
          <DropdownMenuSeparator />
          <DropdownMenuItem disabled>
            <Plus className="h-4 w-4" />
            Create workspace
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
