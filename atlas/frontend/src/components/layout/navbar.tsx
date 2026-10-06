'use client';

import { usePathname } from 'next/navigation';
import { Menu, Search, Command } from 'lucide-react';
import { ThemeToggle } from './theme-toggle';
import { NotificationsMenu } from './notifications-menu';
import { GlobalSearchDialog } from './global-search-dialog';
import { UserMenu } from './user-menu';
import { Breadcrumbs, type BreadcrumbItem } from '@/components/ui/breadcrumbs';
import { cn } from '@/lib/utils';
import { useUIStore } from '@/stores';
import { NAV_ITEMS_BY_SLUG } from '@/constants/nav-config';

function humanize(segment: string): string {
  return segment
    .split('-')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

function useBreadcrumbs(): { title: string; items: BreadcrumbItem[] } {
  const pathname = usePathname() ?? '/dashboard';
  const segments = pathname.replace(/^\/dashboard\/?/, '').split('/').filter(Boolean);

  if (segments.length === 0) {
    return { title: 'Dashboard', items: [] };
  }

  const [moduleSlug, ...rest] = segments;
  const navItem = NAV_ITEMS_BY_SLUG[moduleSlug as string];
  const moduleLabel = navItem?.label ?? humanize(moduleSlug as string);

  const items: BreadcrumbItem[] = [{ label: moduleLabel, href: rest.length > 0 ? `/${moduleSlug}` : undefined }];
  rest.forEach((seg, i) => {
    const isId = /^[0-9a-f-]{8,}$/i.test(seg);
    items.push({ label: isId ? 'Detail' : humanize(seg), href: i < rest.length - 1 ? `/${moduleSlug}/${seg}` : undefined });
  });

  return { title: items[items.length - 1]?.label ?? moduleLabel, items };
}

export function Navbar() {
  const setMobileNavOpen = useUIStore((s) => s.setMobileNavOpen);
  const setCommandPaletteOpen = useUIStore((s) => s.setCommandPaletteOpen);
  const { title, items } = useBreadcrumbs();

  return (
    <header className="flex h-16 shrink-0 items-center gap-3 border-b border-border bg-background px-4 sm:px-6">
      <button
        onClick={() => setMobileNavOpen(true)}
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[var(--radius)] text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors md:hidden"
        aria-label="Open navigation"
      >
        <Menu className="h-5 w-5" />
      </button>

      {/* ── Page Context / Breadcrumb ─────────────────────────── */}
      <div className="min-w-0 flex-1">
        {items.length > 0 && <Breadcrumbs items={items} className="hidden sm:flex" />}
        <h2 className="truncate text-sm font-semibold text-foreground">{title}</h2>
      </div>

      {/* ── Actions ──────────────────────────────────────────── */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => setCommandPaletteOpen(true)}
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

        <button
          onClick={() => setCommandPaletteOpen(true)}
          className="flex h-9 w-9 items-center justify-center rounded-[var(--radius)] text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors md:hidden"
          aria-label="Search"
        >
          <Search className="h-4 w-4" />
        </button>

        <NotificationsMenu />
        <ThemeToggle />
        <UserMenu />
      </div>

      <GlobalSearchDialog />
    </header>
  );
}
