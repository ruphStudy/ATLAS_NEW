import {
  LayoutDashboard,
  Package,
  Building2,
  Boxes,
  FileText,
  Tag,
  Store,
  ShoppingCart,
  Warehouse,
  Truck,
  Sparkles,
  BarChart3,
  LineChart,
  Gauge,
  ShieldCheck,
  ShieldAlert,
  FileSearch,
  ClipboardCheck,
  ClipboardList,
  PackageSearch,
  Activity,
  DatabaseBackup,
  LifeBuoy,
  GitBranch,
  ListChecks,
  Layers,
  Palette,
  Radio,
  Users,
  KeyRound,
  Settings,
  Receipt,
  ScrollText,
  PlugZap,
  Share2,
  PackagePlus,
  PackageCheck,
  Scale,
  GitCompare,
  ListTodo,
  ArrowLeftRight,
  Repeat,
  MapPinned,
  Send,
  Barcode as BarcodeIcon,
  PlaneTakeoff,
  TrendingUp,
  Wallet,
  Cpu,
  Server,
  BrainCircuit,
  Bot,
  MessageSquare,
  CalendarClock,
  FolderClock,
  ShieldQuestion,
  Coins,
  Split,
  RefreshCw,
  HeartPulse,
  Bell,
  History,
  CheckSquare,
  Folder,
  FileStack,
  Stethoscope,
  Search,
  LayoutGrid,
  Link2,
  Blocks,
  Globe2,
  Landmark,
  Languages,
  AlertOctagon,
  Plug,
  Webhook,
  FileKey2,
  Flag,
} from 'lucide-react';

export interface NavItem {
  label: string;
  icon: React.ElementType;
  href: string;
  /** Matches the backend's `module.resource.action` permission-key convention — nav item is visible if the user holds any permission whose key starts with `${permissionSlug}.` (see `hooks/use-permissions.ts`). Also doubles as the `[module]` dynamic-route slug for modules without a bespoke page. */
  permissionSlug: string;
  badge?: string | null;
  badgeVariant?: 'purple' | 'danger' | 'default';
}

export interface NavGroup {
  label: string;
  items: NavItem[];
  /** When true, this group is always fully visible for `isPlatformAdmin` users, bypassing the normal per-item permission check (see `components/layout/sidebar-nav.tsx`). Non-platform-admin users still see it filtered by their permissions as usual. */
  platformAdminOnly?: boolean;
}

/**
 * Real ATLAS backend module registry, grouped for navigation. Every
 * `href` resolves to either a bespoke page (Dashboard, Products,
 * Suppliers) or the generic `/dashboard/[module]` module workspace,
 * which reads/lists that module's real API when a bespoke page hasn't
 * been built yet — never a fake/mocked screen.
 */
export const NAV_GROUPS: NavGroup[] = [
  {
    label: 'Overview',
    items: [
      { label: 'Dashboard', icon: LayoutDashboard, href: '/dashboard', permissionSlug: 'dashboard' },
      { label: 'Setup Wizard', icon: ListChecks, href: '/onboarding', permissionSlug: 'onboarding' },
      { label: 'Search', icon: Search, href: '/search', permissionSlug: 'search' },
    ],
  },
  {
    label: 'Commerce',
    items: [
      { label: 'Purchase Operations', icon: ClipboardList, href: '/purchase-operations', permissionSlug: 'purchase-operations' },
      { label: 'Opportunities', icon: Sparkles, href: '/opportunities', permissionSlug: 'opportunities' },
      { label: 'Products', icon: Package, href: '/products', permissionSlug: 'product-catalog' },
      { label: 'Suppliers', icon: Building2, href: '/suppliers', permissionSlug: 'suppliers' },
      { label: 'RFQs', icon: FileSearch, href: '/rfqs', permissionSlug: 'rfq' },
      { label: 'Procurement', icon: ShieldCheck, href: '/procurement', permissionSlug: 'procurement' },
      { label: 'Inventory', icon: Boxes, href: '/inventory', permissionSlug: 'inventory' },
      { label: 'Purchase Orders', icon: ShoppingCart, href: '/purchase-orders', permissionSlug: 'purchase-orders' },
      { label: 'Quality Inspections', icon: ClipboardCheck, href: '/quality-inspections', permissionSlug: 'quality-inspection' },
      { label: 'Listings', icon: FileText, href: '/listings', permissionSlug: 'listings' },
      { label: 'Pricing', icon: Tag, href: '/pricing', permissionSlug: 'pricing' },
    ],
  },
  {
    label: 'Marketplace',
    items: [
      { label: 'Marketplace Accounts', icon: Store, href: '/marketplace-accounts', permissionSlug: 'marketplace-accounts' },
      { label: 'Marketplace Providers', icon: PlugZap, href: '/marketplace-providers', permissionSlug: 'marketplace-providers' },
      { label: 'Channels', icon: Share2, href: '/channels', permissionSlug: 'multi-channel' },
      { label: 'Marketplace Health', icon: Radio, href: '/marketplace-health', permissionSlug: 'marketplace-health' },
    ],
  },
  {
    label: 'Marketplace Operations',
    items: [
      { label: 'Operations Hub', icon: LayoutGrid, href: '/marketplace-operations', permissionSlug: 'marketplace-operations' },
      { label: 'Sync History & Failures', icon: History, href: '/marketplace-sync-history', permissionSlug: 'marketplace-sync-history' },
      { label: 'Webhooks', icon: Webhook, href: '/marketplace-webhooks', permissionSlug: 'marketplace-webhooks' },
      { label: 'Event Processing', icon: Radio, href: '/marketplace-events', permissionSlug: 'marketplace-events' },
      { label: 'Queue Management', icon: ListChecks, href: '/marketplace-queues', permissionSlug: 'marketplace-queues' },
      { label: 'Error Center', icon: AlertOctagon, href: '/marketplace-errors', permissionSlug: 'marketplace-errors' },
      { label: 'Connection Tests', icon: Plug, href: '/marketplace-connection-tests', permissionSlug: 'marketplace-connection-tests' },
      { label: 'Activity & Audit', icon: Activity, href: '/marketplace-activity', permissionSlug: 'marketplace-activity' },
    ],
  },
  {
    label: 'Warehouse & Fulfillment',
    items: [
      { label: 'Warehouses', icon: Warehouse, href: '/warehouses', permissionSlug: 'warehouses' },
      { label: 'Inventory Items', icon: Boxes, href: '/inventory-items', permissionSlug: 'inventory-items' },
      { label: 'Adjustments', icon: Scale, href: '/inventory-adjustments', permissionSlug: 'inventory-adjustments' },
      { label: 'Reconciliations', icon: GitCompare, href: '/inventory-reconciliations', permissionSlug: 'inventory-reconciliations' },
      { label: 'Cycle Counts', icon: ListTodo, href: '/inventory-cycle-counts', permissionSlug: 'inventory-cycle-counts' },
      { label: 'Movements', icon: ArrowLeftRight, href: '/inventory-movements', permissionSlug: 'inventory-movements' },
      { label: 'Transfers', icon: Repeat, href: '/inventory-transfers', permissionSlug: 'inventory-transfers' },
      { label: 'Receiving', icon: PackageSearch, href: '/receiving', permissionSlug: 'warehouse-receiving' },
      { label: 'Putaway', icon: PackagePlus, href: '/putaway', permissionSlug: 'putaway' },
      { label: 'Picking', icon: MapPinned, href: '/picking', permissionSlug: 'picking' },
      { label: 'Packing', icon: PackageCheck, href: '/packing', permissionSlug: 'packing' },
      { label: 'Dispatch', icon: Send, href: '/dispatch', permissionSlug: 'dispatch' },
      { label: 'Barcodes', icon: BarcodeIcon, href: '/barcodes', permissionSlug: 'barcodes' },
      { label: 'FBA Shipments', icon: PlaneTakeoff, href: '/fba-shipments', permissionSlug: 'fba-shipments' },
      { label: 'Shipments', icon: Truck, href: '/shipments', permissionSlug: 'shipments' },
    ],
  },
  {
    label: 'Intelligence',
    items: [
      { label: 'AI Workflows', icon: Sparkles, href: '/ai-workflow', permissionSlug: 'ai-workflow', badgeVariant: 'purple' },
      { label: 'Sales Analytics', icon: LineChart, href: '/sales-analytics', permissionSlug: 'sales-analytics' },
      { label: 'Profit Analytics', icon: TrendingUp, href: '/profit-analytics', permissionSlug: 'profit-analytics' },
      { label: 'Supplier Analytics', icon: Building2, href: '/supplier-analytics', permissionSlug: 'supplier-analytics' },
      { label: 'Financial Analytics', icon: Wallet, href: '/financial-analytics', permissionSlug: 'financial-analytics' },
      { label: 'Executive Dashboard', icon: BarChart3, href: '/dashboard/executive-dashboard', permissionSlug: 'executive-dashboard' },
      { label: 'Reports', icon: FileText, href: '/dashboard/reports', permissionSlug: 'reports' },
    ],
  },
  {
    label: 'Operations & Collaboration',
    items: [
      { label: 'Notifications', icon: Bell, href: '/notifications', permissionSlug: 'notifications' },
      { label: 'Activity Center', icon: History, href: '/activity', permissionSlug: 'activity-center' },
      { label: 'Tasks', icon: CheckSquare, href: '/tasks', permissionSlug: 'task-management' },
      { label: 'Files', icon: Folder, href: '/files', permissionSlug: 'file-management' },
      { label: 'Documents', icon: FileStack, href: '/documents', permissionSlug: 'document-management' },
      { label: 'Tags', icon: Tag, href: '/tags', permissionSlug: 'tags-management' },
      { label: 'Operations Health', icon: Stethoscope, href: '/operations-health', permissionSlug: 'operations-health' },
    ],
  },
  {
    label: 'AI & Automation',
    items: [
      { label: 'AI Control Center', icon: Cpu, href: '/ai-control-center', permissionSlug: 'ai-control-center', badgeVariant: 'purple' },
      { label: 'AI Content Studio', icon: Sparkles, href: '/ai-content-studio', permissionSlug: 'ai-description', badgeVariant: 'purple' },
      { label: 'AI Providers', icon: Server, href: '/ai-providers', permissionSlug: 'ai-provider-registry' },
      { label: 'AI Models', icon: BrainCircuit, href: '/ai-models', permissionSlug: 'ai-model-management' },
      { label: 'AI Agents', icon: Bot, href: '/ai-agents', permissionSlug: 'ai-agent' },
      { label: 'AI Prompts', icon: MessageSquare, href: '/ai-prompts', permissionSlug: 'ai-prompt' },
      { label: 'AI Scheduler', icon: CalendarClock, href: '/ai-scheduler', permissionSlug: 'ai-job-scheduler' },
      { label: 'AI Context', icon: FolderClock, href: '/ai-context', permissionSlug: 'ai-context-management' },
      { label: 'AI Guardrails', icon: ShieldQuestion, href: '/ai-guardrails', permissionSlug: 'ai-guardrails' },
      { label: 'AI Cost & Usage', icon: Coins, href: '/ai-cost', permissionSlug: 'ai-cost-tracking' },
      { label: 'AI Decisions', icon: Split, href: '/ai-decisions', permissionSlug: 'ai-decision-engine' },
      { label: 'AI Reliability', icon: RefreshCw, href: '/ai-reliability', permissionSlug: 'ai-fallback-retry' },
      { label: 'AI Health & Audit', icon: HeartPulse, href: '/ai-monitoring', permissionSlug: 'ai-monitoring-health' },
    ],
  },
  {
    label: 'Enterprise & Operations',
    items: [
      { label: 'Enterprise Health', icon: Gauge, href: '/enterprise-health', permissionSlug: 'enterprise-health' },
      { label: 'Monitoring', icon: Activity, href: '/monitoring-framework', permissionSlug: 'monitoring-framework' },
      { label: 'Enterprise Audit', icon: ShieldAlert, href: '/dashboard/enterprise-audit', permissionSlug: 'enterprise-audit' },
      { label: 'Disaster Recovery', icon: LifeBuoy, href: '/disaster-recovery', permissionSlug: 'disaster-recovery' },
      { label: 'Backup Management', icon: DatabaseBackup, href: '/backup-management', permissionSlug: 'backup-management' },
      { label: 'Approval Workflow', icon: ListChecks, href: '/approval-workflow', permissionSlug: 'approval-workflow' },
      { label: 'Enterprise Workflow', icon: GitBranch, href: '/enterprise-workflow-engine', permissionSlug: 'enterprise-workflow-engine' },
      { label: 'Business Rules', icon: Split, href: '/business-rules', permissionSlug: 'business-rules-engine' },
      { label: 'Governance Dashboard', icon: ShieldQuestion, href: '/governance', permissionSlug: 'governance' },
    ],
  },
  {
    label: 'Multi-Country & Compliance',
    items: [
      { label: 'Multi-Country Hub', icon: LayoutGrid, href: '/multi-country', permissionSlug: 'country' },
      { label: 'Countries', icon: Globe2, href: '/countries', permissionSlug: 'country' },
      { label: 'Currencies & Rates', icon: Coins, href: '/currencies', permissionSlug: 'currency' },
      { label: 'Tax Engine', icon: Landmark, href: '/tax', permissionSlug: 'tax' },
      { label: 'GST / VAT', icon: ScrollText, href: '/gst-vat', permissionSlug: 'gst-vat' },
      { label: 'Compliance', icon: ShieldCheck, href: '/compliance', permissionSlug: 'compliance-framework' },
      { label: 'Localization', icon: Languages, href: '/localization', permissionSlug: 'localization' },
      { label: 'Regional Settings', icon: MapPinned, href: '/regional-settings', permissionSlug: 'regional-settings' },
    ],
  },
  {
    label: 'Business Structure',
    items: [
      { label: 'Businesses', icon: Layers, href: '/multi-business', permissionSlug: 'multi-business' },
      { label: 'Brands', icon: Palette, href: '/multi-brand', permissionSlug: 'multi-brand' },
      { label: 'Workspaces', icon: Building2, href: '/workspaces', permissionSlug: 'workspaces' },
    ],
  },
  {
    label: 'Developer & Integrations',
    items: [
      { label: 'Developer Hub', icon: LayoutGrid, href: '/developer', permissionSlug: 'developer' },
      { label: 'API Keys', icon: KeyRound, href: '/api-keys', permissionSlug: 'api-key-management' },
      { label: 'Webhooks', icon: Radio, href: '/webhooks', permissionSlug: 'webhook-framework' },
      { label: 'OAuth Connections', icon: Link2, href: '/oauth-connections', permissionSlug: 'oauth-management' },
      { label: 'SSO Configuration', icon: ShieldCheck, href: '/sso-connections', permissionSlug: 'sso-framework' },
    ],
  },
  {
    label: 'Provider Administration',
    items: [
      { label: 'Provider Admin Hub', icon: LayoutGrid, href: '/provider-admin', permissionSlug: 'provider-administration' },
      { label: 'Payment Providers', icon: Wallet, href: '/payment-providers', permissionSlug: 'payment-provider' },
      { label: 'Supplier Providers', icon: Building2, href: '/supplier-providers', permissionSlug: 'supplier-provider' },
      { label: 'Shipping Providers', icon: Truck, href: '/shipping-providers', permissionSlug: 'shipping-provider' },
      { label: 'Notification Providers', icon: Bell, href: '/notification-providers', permissionSlug: 'notification-provider' },
      { label: 'Communication Operations', icon: History, href: '/notification-operations', permissionSlug: 'notification-provider' },
    ],
  },
  {
    label: 'Platform Administration',
    platformAdminOnly: true,
    items: [
      { label: 'Platform Admin Hub', icon: LayoutGrid, href: '/platform-admin', permissionSlug: 'saas-administration' },
      { label: 'Tenants', icon: Building2, href: '/platform-admin/tenants', permissionSlug: 'saas-administration' },
      { label: 'Tenant Analytics', icon: BarChart3, href: '/tenant-analytics', permissionSlug: 'tenant-analytics' },
      { label: 'SaaS Monitoring', icon: HeartPulse, href: '/saas-monitoring', permissionSlug: 'saas-monitoring' },
      { label: 'SaaS Audit', icon: ShieldAlert, href: '/saas-audit', permissionSlug: 'saas-audit' },
      { label: 'App Store & Plugins', icon: Blocks, href: '/app-store', permissionSlug: 'app-store' },
      { label: 'Plans', icon: Tag, href: '/plans', permissionSlug: 'plan-management' },
      { label: 'Subscriptions', icon: Repeat, href: '/subscriptions', permissionSlug: 'subscription-management' },
      { label: 'Quotas', icon: Gauge, href: '/quotas', permissionSlug: 'quota-management' },
      { label: 'Licenses', icon: FileKey2, href: '/licenses', permissionSlug: 'license-management' },
      { label: 'Feature Flags', icon: Flag, href: '/feature-flags', permissionSlug: 'feature-flags' },
    ],
  },
  {
    label: 'Administration',
    items: [
      { label: 'Users', icon: Users, href: '/users', permissionSlug: 'users' },
      { label: 'Roles & Permissions', icon: KeyRound, href: '/roles-permissions', permissionSlug: 'roles-permissions' },
      { label: 'Audit Logs', icon: ScrollText, href: '/audit-logs', permissionSlug: 'audit-logs' },
      { label: 'Billing', icon: Receipt, href: '/billing', permissionSlug: 'billing-engine' },
      { label: 'Settings', icon: Settings, href: '/settings', permissionSlug: 'settings' },
    ],
  },
];

/** Flat lookup of every nav item by its dynamic-route slug (final `href` path segment) — used by the generic `/dashboard/[module]` workspace page to render the right label/icon. */
export const NAV_ITEMS_BY_SLUG: Record<string, NavItem> = Object.fromEntries(
  NAV_GROUPS.flatMap((g) => g.items).map((item) => [item.href.split('/').pop() as string, item]),
);
