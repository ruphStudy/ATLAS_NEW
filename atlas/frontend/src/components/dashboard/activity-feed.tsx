'use client';

import { motion } from 'framer-motion';
import { ShoppingCart, Package, Tag, AlertTriangle, TrendingUp, User, Clock } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';

// ── Data ──────────────────────────────────────────────────────
const activities = [
  {
    id: '1',
    type: 'order',
    icon: ShoppingCart,
    iconColor: 'text-emerald-500',
    iconBg: 'bg-emerald-500/10',
    title: 'New order received',
    detail: '#ORD-4829 · $234.50',
    sub: 'Amazon US · ASIN B0CX9J5MN1',
    time: '2 min ago',
  },
  {
    id: '2',
    type: 'inventory',
    icon: AlertTriangle,
    iconColor: 'text-amber-500',
    iconBg: 'bg-amber-500/10',
    title: 'Low stock alert',
    detail: 'Laptop Stand Pro · 12 units left',
    sub: 'Reorder point reached',
    time: '14 min ago',
  },
  {
    id: '3',
    type: 'listing',
    icon: TrendingUp,
    iconColor: 'text-violet-500',
    iconBg: 'bg-violet-500/10',
    title: 'Listing rank improved',
    detail: 'Wireless Earbuds Pro',
    sub: '#4 → #2 in Electronics',
    time: '1 hr ago',
  },
  {
    id: '4',
    type: 'pricing',
    icon: Tag,
    iconColor: 'text-blue-500',
    iconBg: 'bg-blue-500/10',
    title: 'Price adjusted',
    detail: 'USB-C Hub 7-in-1 · $39.99 → $43.99',
    sub: 'AI repricing recommendation',
    time: '2 hr ago',
  },
  {
    id: '5',
    type: 'supplier',
    icon: Package,
    iconColor: 'text-sky-500',
    iconBg: 'bg-sky-500/10',
    title: 'Shipment received',
    detail: 'PO-2024-189 · 500 units',
    sub: 'Shenzhen Tech Supplies Co.',
    time: '4 hr ago',
  },
  {
    id: '6',
    type: 'user',
    icon: User,
    iconColor: 'text-rose-500',
    iconBg: 'bg-rose-500/10',
    title: 'Team member joined',
    detail: 'Sarah Kim · Analyst',
    sub: 'Invitation accepted',
    time: '6 hr ago',
  },
];

// ── Component ─────────────────────────────────────────────────
export function ActivityFeed() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.55 }}
    >
      <Card className="h-full">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle>Recent Activity</CardTitle>
            <button className="text-xs text-primary hover:underline">View all</button>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          <ul>
            {activities.map((item, i) => {
              const Icon = item.icon;
              return (
                <motion.li
                  key={item.id}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.6 + i * 0.06 }}
                  className={cn(
                    'flex items-start gap-3 px-6 py-3.5 hover:bg-muted/50 transition-colors cursor-default',
                    i !== activities.length - 1 && 'border-b border-border/60',
                  )}
                >
                  <div
                    className={cn(
                      'flex h-8 w-8 shrink-0 items-center justify-center rounded-lg mt-0.5',
                      item.iconBg,
                    )}
                  >
                    <Icon className={cn('h-3.5 w-3.5', item.iconColor)} />
                  </div>

                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-foreground leading-none">
                      {item.title}
                    </p>
                    <p className="mt-0.5 text-xs text-foreground/80 truncate">{item.detail}</p>
                    <p className="mt-0.5 text-[11px] text-muted-foreground truncate">{item.sub}</p>
                  </div>

                  <div className="flex items-center gap-1 shrink-0 text-[11px] text-muted-foreground mt-0.5">
                    <Clock className="h-3 w-3" />
                    <span>{item.time}</span>
                  </div>
                </motion.li>
              );
            })}
          </ul>
        </CardContent>
      </Card>
    </motion.div>
  );
}
