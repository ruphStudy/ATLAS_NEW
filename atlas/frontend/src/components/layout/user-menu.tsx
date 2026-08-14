'use client';

import { useRouter } from 'next/navigation';
import { LogOut, Settings, ShieldCheck, User as UserIcon } from 'lucide-react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { useCurrentUser, useLogout } from '@/hooks';
import { useWorkspaceStore } from '@/stores';
import { ROUTES } from '@/constants';

export function UserMenu() {
  const user = useCurrentUser();
  const logout = useLogout();
  const router = useRouter();
  const activeWorkspaceId = useWorkspaceStore((s) => s.activeWorkspaceId);

  if (!user) return null;

  const fullName = `${user.firstName} ${user.lastName}`;
  const initials = `${user.firstName[0] ?? ''}${user.lastName[0] ?? ''}`.toUpperCase();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="flex items-center gap-2 rounded-[var(--radius)] px-2 py-1.5 text-sm hover:bg-secondary transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
          <Avatar className="h-7 w-7">
            <AvatarFallback className="text-[10px]">{initials}</AvatarFallback>
          </Avatar>
          <div className="hidden md:block text-left">
            <p className="text-xs font-semibold text-foreground leading-none">{fullName}</p>
            <p className="text-[11px] capitalize text-muted-foreground leading-none mt-0.5">{user.role.toLowerCase()}</p>
          </div>
        </button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel>{user.email}</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={() => router.push(ROUTES.PROFILE)}>
          <UserIcon className="h-4 w-4" />
          Profile
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => router.push(ROUTES.SECURITY)}>
          <ShieldCheck className="h-4 w-4" />
          Security
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
  );
}
