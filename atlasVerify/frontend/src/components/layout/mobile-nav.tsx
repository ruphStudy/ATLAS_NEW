'use client';

import { Drawer, DrawerContent, DrawerTitle } from '@/components/ui/drawer';
import { useUIStore } from '@/stores';
import { SidebarNav } from './sidebar-nav';
import { WorkspaceSwitcher } from './workspace-switcher';

export function MobileNav() {
  const open = useUIStore((s) => s.mobileNavOpen);
  const setOpen = useUIStore((s) => s.setMobileNavOpen);

  return (
    <Drawer open={open} onOpenChange={setOpen}>
      <DrawerContent side="left" size="sm" hideClose className="gap-0 p-0">
        <DrawerTitle className="sr-only">Navigation</DrawerTitle>
        <div className="flex h-16 shrink-0 items-center gap-2.5 border-b border-sidebar-border px-4">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gradient-brand shadow-sm">
            <span className="text-sm font-bold text-white">A</span>
          </div>
          <span className="text-base font-bold tracking-tight text-foreground">ATLAS</span>
        </div>
        <WorkspaceSwitcher collapsed={false} />
        <SidebarNav collapsed={false} onNavigate={() => setOpen(false)} />
      </DrawerContent>
    </Drawer>
  );
}
