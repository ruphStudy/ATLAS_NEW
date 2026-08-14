'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Search, Loader2, CornerDownLeft } from 'lucide-react';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { useGlobalSearch } from '@/hooks';
import { recordSearchResultOpened } from '@/services/search.service';
import { useUIStore } from '@/stores';
import type { GlobalSearchResultItem } from '@/types';

function resolveHref(item: GlobalSearchResultItem): string | null {
  const ref = item.navigationRef;
  if (typeof ref === 'string') return ref;
  if (ref && typeof ref === 'object' && 'path' in ref && typeof (ref as { path?: unknown }).path === 'string') {
    return (ref as { path: string }).path;
  }
  return null;
}

export function GlobalSearchDialog() {
  const open = useUIStore((s) => s.commandPaletteOpen);
  const setOpen = useUIStore((s) => s.setCommandPaletteOpen);
  const [query, setQuery] = useState('');
  const router = useRouter();
  const { data, isFetching } = useGlobalSearch(query);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setOpen(!open);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const handleSelect = (item: GlobalSearchResultItem) => {
    void recordSearchResultOpened(item.entityType, item.entityId).catch(() => undefined);
    const href = resolveHref(item);
    setOpen(false);
    setQuery('');
    if (href) router.push(href);
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) setQuery('');
      }}
    >
      <DialogContent size="lg" hideClose className="top-24 translate-y-0 p-0">
        <DialogTitle className="sr-only">Search</DialogTitle>
        <div className="flex items-center gap-3 border-b border-border px-4 py-3">
          <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
          <input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search products, suppliers, orders…"
            className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground outline-none"
          />
          {isFetching ? <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin text-muted-foreground" /> : null}
          <kbd className="shrink-0 rounded border border-border px-1.5 py-0.5 text-[10px] text-muted-foreground">ESC</kbd>
        </div>

        <div className="max-h-[60vh] overflow-y-auto p-2">
          {query.trim().length < 2 && <p className="px-2 py-6 text-center text-xs text-muted-foreground">Start typing to search across your workspace…</p>}

          {query.trim().length >= 2 && !isFetching && (data?.items.length ?? 0) === 0 && (
            <p className="px-2 py-6 text-center text-xs text-muted-foreground">No results for &ldquo;{query}&rdquo;</p>
          )}

          {Object.entries(data?.groupedByModule ?? {}).map(([moduleName, items]) => (
            <div key={moduleName} className="mb-1">
              <p className="px-2 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{moduleName}</p>
              {items.map((item) => (
                <button
                  key={`${item.entityType}-${item.entityId}`}
                  onClick={() => handleSelect(item)}
                  className="flex w-full items-center gap-3 rounded-[calc(var(--radius)-4px)] px-2.5 py-2 text-left text-sm hover:bg-secondary transition-colors"
                >
                  <span className="min-w-0 flex-1 truncate text-foreground">{item.title}</span>
                  {item.status && (
                    <Badge variant="outline" className="shrink-0 text-[10px]">
                      {item.status}
                    </Badge>
                  )}
                  <CornerDownLeft className="h-3 w-3 shrink-0 text-muted-foreground opacity-0 group-hover:opacity-100" />
                </button>
              ))}
            </div>
          ))}
        </div>

        <button
          onClick={() => {
            const target = query.trim() ? `/dashboard/search?q=${encodeURIComponent(query.trim())}` : '/dashboard/search';
            setOpen(false);
            setQuery('');
            router.push(target);
          }}
          className="block w-full border-t border-border px-4 py-2.5 text-center text-xs font-medium text-primary hover:bg-secondary"
        >
          Advanced search
        </button>
      </DialogContent>
    </Dialog>
  );
}
