import { useUIStore } from '@/stores';

/** Promise-based confirm dialog — `await confirm({ title, description, variant: 'danger' })` resolves `true`/`false`. Rendered globally by `<ConfirmDialogHost />` in `providers/providers.tsx`. */
export function useConfirm() {
  return useUIStore((s) => s.confirm);
}
