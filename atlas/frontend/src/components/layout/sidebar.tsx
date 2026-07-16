'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard,
  Package,
  Building2,
  Boxes,
  FileText,
  Tag,
  Store,
  Sparkles,
  BarChart3,
  Bell,
  Settings,
  ChevronLeft,
  ChevronsUpDown,
  Zap,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Tooltip } from '@/components/ui/tooltip';

// ── Types ─────────────────────────────────────────────────────
interface NavItem {
  label: string;
  icon: React.ElementType;
  href: string;
  badge?: string | null;
  badgeVariant?: 'purple' | 'danger' | 'default';
}

interface NavGroup {
  label: string;
  items: NavItem[];
}

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
}

// ── Data ──────────────────────────────────────────────────────
const navGroups: NavGroup[] = [
  {
    label: 'Overview',
    items: [{ label: 'Dashboard', icon: LayoutDashboard, href: '/dashboard' }],
  },
  {
    label: 'Commerce',
    items: [
      { label: 'Products', icon: Package, href: '/dashboard/products' },
      { label: 'Suppliers', icon: Building2, href: '/dashboard/suppliers' },
      { label: 'Inventory', icon: Boxes, href: '/dashboard/inventory', badge: '4.3K' },
      { label: 'Listings', icon: FileText, href: '/dashboard/listings' },
      { label: 'Pricing', icon: Tag, href: '/dashboard/pricing' },
      { label: 'Marketplace', icon: Store, href: '/dashboard/marketplace' },
    ],
  },
  {
    label: 'Intelligence',
    items: [
      {
        label: 'AI Insights',
        icon: Sparkles,
        href: '/dashboard/ai',
        badge: '3',
        badgeVariant: 'purple',
      },
      { label: 'Reports', icon: BarChart3, href: '/dashboard/reports' },
    ],
  },
  {
    label: 'System',
    items: [
      {
        label: 'Notifications',
        icon: Bell,
        href: '/dashboard/notifications',
        badge: '5',
        badgeVariant: 'danger',
      },
      { label: 'Settings', icon: Settings, href: '/dashboard/settings' },
    ],
  },
];

const workspace = { name: 'Acme Corp', plan: 'Professional', initials: 'AC' };
const user = { name: 'John Doe', email: 'john@acmecorp.com', role: 'Admin', initials: 'JD' };

// ── Sidebar Component ─────────────────────────────────────────
export function Sidebar({ collapsed, onToggle }: SidebarProps) {
  const pathname = usePathname();

  return (
    <motion.aside
      animate={{ width: collapsed ? 72 : 260 }}
      transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
      className="relative flex h-full flex-col overflow-hidden border-r border-sidebar-border bg-sidebar shrink-0"
    >
      {/* ── Logo ─────────────────────────────────────────────── */}
      <div className="flex h-16 items-center justify-between px-4 border-b border-sidebar-border shrink-0">
        <AnimatePresence mode="wait">
          {!collapsed && (
            <motion.div
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -8 }}
              transition={{ duration: 0.2 }}
              className="flex items-center gap-2.5 overflow-hidden"
            >
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gradient-brand shadow-sm">
                <span className="text-sm font-bold text-white">A</span>
              </div>
              <span className="text-base font-bold tracking-tight text-foreground whitespace-nowrap">
                ATLAS
              </span>
            </motion.div>
          )}
        </AnimatePresence>

        {collapsed && (
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-brand shadow-sm mx-auto">
            <span className="text-sm font-bold text-white">A</span>
          </div>
        )}

        {!collapsed && (
          <button
            onClick={onToggle}
            className="flex h-7 w-7 items-center justify-center rounded-lg text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors shrink-0"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* ── Workspace Switcher ────────────────────────────────── */}
      <div className="p-3 border-b border-sidebar-border shrink-0">
        <Tooltip content={collapsed ? workspace.name : undefined} side="right">
          <button
            className={cn(
              'flex w-full items-center gap-2.5 rounded-[var(--radius)] px-2.5 py-2',
              'text-sm text-foreground hover:bg-secondary transition-colors',
            )}
          >
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-gradient-brand text-white text-xs font-bold">
              {workspace.initials}
            </div>
            <AnimatePresence>
              {!collapsed && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="flex flex-1 items-center justify-between overflow-hidden"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-foreground">
                      {workspace.name}
                    </p>
                    <p className="text-xs text-muted-foreground">{workspace.plan}</p>
                  </div>
                  <ChevronsUpDown className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                </motion.div>
              )}
            </AnimatePresence>
          </button>
        </Tooltip>
      </div>

      {/* ── Navigation ───────────────────────────────────────── */}
      <nav className="flex-1 overflow-y-auto overflow-x-hidden py-3 px-2 space-y-5">
        {navGroups.map((group) => (
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
              {group.items.map((item) => {
                const isActive = pathname === item.href;
                const Icon = item.icon;

                return (
                  <li key={item.href}>
                    <Tooltip content={collapsed ? item.label : undefined} side="right">
                      <Link
                        href={item.href}
                        className={cn(
                          'group flex items-center gap-2.5 rounded-[calc(var(--radius)-2px)] px-2.5 py-2',
                          'text-sm transition-all duration-150',
                          isActive
                            ? 'bg-gradient-brand text-white shadow-sm'
                            : 'text-muted-foreground hover:bg-secondary hover:text-foreground',
                        )}
                      >
                        <Icon
                          className={cn(
                            'h-4 w-4 shrink-0 transition-transform duration-150',
                            isActive ? 'text-white' : 'group-hover:scale-105',
                          )}
                        />

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
        ))}
      </nav>

      {/* ── Upgrade CTA ──────────────────────────────────────── */}
      <AnimatePresence>
        {!collapsed && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="mx-3 mb-3 rounded-[var(--radius)] bg-gradient-brand-soft border border-primary/15 p-3"
          >
            <div className="flex items-start gap-2.5">
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-gradient-brand">
                <Zap className="h-3.5 w-3.5 text-white" />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-semibold text-foreground">Upgrade to Enterprise</p>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  Unlock AI agents & advanced analytics
                </p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── User Profile ─────────────────────────────────────── */}
      <div className="border-t border-sidebar-border p-3 shrink-0">
        <Tooltip content={collapsed ? user.name : undefined} side="right">
          <button
            className={cn(
              'flex w-full items-center gap-2.5 rounded-[var(--radius)] px-2 py-2',
              'text-sm hover:bg-secondary transition-colors',
            )}
          >
            <Avatar className="h-7 w-7 shrink-0">
              <AvatarFallback className="text-[10px]">{user.initials}</AvatarFallback>
            </Avatar>
            <AnimatePresence>
              {!collapsed && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="flex flex-1 items-center justify-between overflow-hidden"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-foreground">{user.name}</p>
                    <p className="text-xs text-muted-foreground">{user.role}</p>
                  </div>
                  <ChevronsUpDown className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                </motion.div>
              )}
            </AnimatePresence>
          </button>
        </Tooltip>

        {/* Expand button when collapsed */}
        {collapsed && (
          <button
            onClick={onToggle}
            className="mt-2 flex h-7 w-full items-center justify-center rounded-lg text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors"
          >
            <ChevronLeft className="h-3.5 w-3.5 rotate-180" />
          </button>
        )}
      </div>
    </motion.aside>
  );
}
