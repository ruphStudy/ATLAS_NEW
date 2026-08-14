import { useUIStore, type Toast, type ToastVariant } from '@/stores';

const DEFAULT_DURATION = 5000;

export function useToast() {
  const addToast = useUIStore((s) => s.addToast);
  const removeToast = useUIStore((s) => s.removeToast);
  const toasts = useUIStore((s) => s.toasts);

  const toast = (options: Omit<Toast, 'id'>) => {
    const id = addToast(options);
    const duration = options.duration ?? DEFAULT_DURATION;
    if (duration > 0) {
      setTimeout(() => removeToast(id), duration);
    }
    return id;
  };

  const shortcut = (variant: ToastVariant) => (title: string, description?: string) => toast({ title, description, variant });

  return {
    toasts,
    toast,
    dismiss: removeToast,
    success: shortcut('success'),
    error: shortcut('danger'),
    warning: shortcut('warning'),
    info: shortcut('info'),
  };
}
