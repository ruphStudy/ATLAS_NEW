'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { AnimatePresence, motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { Tooltip } from '@/components/ui/tooltip';
import { NAV_GROUPS } from '@/constants/nav-config';
import { usePermissionChecks } from '@/hooks';

interface SidebarNavProps {
  collapsed?: boolean;
  onNavigate?: () => void;
}

export function SidebarNav({ collapsed = false, onNavigate }: SidebarNavProps) {
  const pathname = usePathname();
  const { canAccessModule, isLoaded } = usePermissionChecks();

  return (
    <nav className="flex-1 overflow-y-auto overflow-x-hidden py-3 px-2 space-y-5">
      {NAV_GROUPS.map((group) => {
        // Until permissions have loaded, show everything (avoids a flash of an empty sidebar); once loaded, filter to what the user can actually access.
        const visibleItems = isLoaded ? group.items.filter((item) => canAccessModule(item.permissionSlug)) : group.items;
        if (visibleItems.length === 0) return null;

        return (
          <div key={group.label}>
            <AnimatePresence>
              {!collapsed && (
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="mb-1.5 px-2.5 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground"
                >
                  {group.label}
                </motion.p>
              )}
            </AnimatePresence>

            <ul className="space-y-0.5">
              {visibleItems.map((item) => {
                const isActive = pathname === item.href || pathname?.startsWith(`${item.href}/`);
                const Icon = item.icon;

                return (
                  <li key={item.href}>
                    <Tooltip content={collapsed ? item.label : undefined} side="right">
                      <Link
                        href={item.href}
                        onClick={onNavigate}
                        className={cn(
                          'group flex items-center gap-2.5 rounded-[calc(var(--radius)-2px)] px-2.5 py-2',
                          'text-sm transition-all duration-150',
                          isActive ? 'bg-gradient-brand text-white shadow-sm' : 'text-muted-foreground hover:bg-secondary hover:text-foreground',
                        )}
                      >
                        <Icon className={cn('h-4 w-4 shrink-0 transition-transform duration-150', isActive ? 'text-white' : 'group-hover:scale-105')} />

                        <AnimatePresence>
                          {!collapsed && (
                            <motion.span
                              initial={{ opacity: 0 }}
                              animate={{ opacity: 1 }}
                              exit={{ opacity: 0 }}
                              className="flex flex-1 items-center justify-between overflow-hidden whitespace-nowrap"
                            >
                              <span className="truncate font-medium">{item.label}</span>
                              {item.badge && (
                                <span
                                  className={cn(
                                    'ml-auto flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-[10px] font-bold',
                                    isActive
                                      ? 'bg-white/25 text-white'
                                      : item.badgeVariant === 'purple'
                                        ? 'bg-violet-500/15 text-violet-500'
                                        : item.badgeVariant === 'danger'
                                          ? 'bg-danger/15 text-danger'
                                          : 'bg-muted text-muted-foreground',
                                  )}
                                >
                                  {item.badge}
                                </span>
                              )}
                            </motion.span>
                          )}
                        </AnimatePresence>
                      </Link>
                    </Tooltip>
                  </li>
                );
              })}
            </ul>
          </div>
        );
      })}
    </nav>
  );
}
