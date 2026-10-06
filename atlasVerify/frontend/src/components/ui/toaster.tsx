'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { CheckCircle2, AlertTriangle, XCircle, Info, X } from 'lucide-react';
import { useUIStore, type ToastVariant } from '@/stores';
import { cn } from '@/lib/utils';

const iconByVariant: Record<ToastVariant, React.ElementType> = {
  default: Info,
  success: CheckCircle2,
  warning: AlertTriangle,
  danger: XCircle,
  info: Info,
};

const colorByVariant: Record<ToastVariant, string> = {
  default: 'text-foreground',
  success: 'text-success',
  warning: 'text-warning',
  danger: 'text-danger',
  info: 'text-info',
};

/** Global toast host — rendered once in `providers/providers.tsx`, driven entirely by `useUIStore`'s `toasts` array. */
export function Toaster() {
  const toasts = useUIStore((s) => s.toasts);
  const removeToast = useUIStore((s) => s.removeToast);

  return (
    <div className="pointer-events-none fixed bottom-4 right-4 z-[100] flex w-full max-w-sm flex-col gap-2">
      <AnimatePresence initial={false}>
        {toasts.map((t) => {
          const Icon = iconByVariant[t.variant ?? 'default'];
          return (
            <motion.div
              key={t.id}
              layout
              initial={{ opacity: 0, y: 12, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, x: 24, transition: { duration: 0.15 } }}
              className={cn(
                'pointer-events-auto flex items-start gap-3 rounded-[var(--radius)] border border-border',
                'bg-popover p-4 shadow-card-hover',
              )}
              role="status"
            >
              <Icon className={cn('mt-0.5 h-4.5 w-4.5 shrink-0', colorByVariant[t.variant ?? 'default'])} />
              <div className="min-w-0 flex-1">
                {t.title && <p className="text-sm font-semibold text-foreground">{t.title}</p>}
                {t.description && <p className="mt-0.5 text-xs text-muted-foreground">{t.description}</p>}
              </div>
              <button
                onClick={() => removeToast(t.id)}
                className="shrink-0 rounded-md p-0.5 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
                aria-label="Dismiss"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
