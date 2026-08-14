// Zustand stores barrel
//
// Convention:
//   - One store per domain slice
//   - Persist auth/workspace/UI-preference slices to localStorage
//
// Stores:
//   - useAuthStore      → authenticated user, session lifecycle
//   - useWorkspaceStore → active workspace/business/brand/channel context
//   - useUIStore        → sidebar state, toasts, confirm dialog, command palette

export * from './auth-store';
export * from './workspace-store';
export * from './ui-store';
