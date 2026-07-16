export const APP_NAME = 'ATLAS';
export const APP_VERSION = process.env['NEXT_PUBLIC_APP_VERSION'] ?? '1.0.0';

export const API_URL = process.env['NEXT_PUBLIC_API_URL'] ?? 'http://localhost:3001/api/v1';

export const ROUTES = {
  HOME: '/',
  // Auth
  LOGIN: '/login',
  REGISTER: '/register',
  FORGOT_PASSWORD: '/forgot-password',
  // Dashboard
  DASHBOARD: '/dashboard',
  PRODUCTS: '/dashboard/products',
  SUPPLIERS: '/dashboard/suppliers',
  INVENTORY: '/dashboard/inventory',
  LISTINGS: '/dashboard/listings',
  PRICING: '/dashboard/pricing',
  MARKETPLACE: '/dashboard/marketplace',
  REPORTS: '/dashboard/reports',
  NOTIFICATIONS: '/dashboard/notifications',
  SETTINGS: '/dashboard/settings',
} as const;

export const QUERY_KEYS = {
  USERS: 'users',
  WORKSPACE: 'workspace',
  PRODUCTS: 'products',
  SUPPLIERS: 'suppliers',
  INVENTORY: 'inventory',
  LISTINGS: 'listings',
  PRICING: 'pricing',
  MARKETPLACE: 'marketplace',
  DASHBOARD: 'dashboard',
  REPORTS: 'reports',
  NOTIFICATIONS: 'notifications',
} as const;
