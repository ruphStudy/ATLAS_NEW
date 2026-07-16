'use client';

import { motion } from 'framer-motion';
import { Plus, ArrowUpDown, FileText, Tag, Sparkles, BarChart3 } from 'lucide-react';
import { cn } from '@/lib/utils';

const actions = [
  {
    label: 'Add Product',
    icon: Plus,
    gradient: 'from-violet-500 to-purple-600',
    description: 'List a new SKU',
  },
  {
    label: 'Sync Amazon',
    icon: ArrowUpDown,
    gradient: 'from-amber-500 to-orange-600',
    description: 'Pull latest data',
  },
  {
    label: 'Run AI Analysis',
    icon: Sparkles,
    gradient: 'from-blue-500 to-indigo-600',
    description: 'Get insights',
  },
  {
    label: 'Create Report',
    icon: BarChart3,
    gradient: 'from-emerald-500 to-teal-600',
    description: 'Export analytics',
  },
  {
    label: 'Update Pricing',
    icon: Tag,
    gradient: 'from-rose-500 to-pink-600',
    description: 'Reprice SKUs',
  },
  {
    label: 'New Listing',
    icon: FileText,
    gradient: 'from-sky-500 to-cyan-600',
    description: 'Draft content',
  },
];

export function QuickActions() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.2 }}
    >
      <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
        {actions.map((action, i) => {
          const Icon = action.icon;
          return (
            <motion.button
              key={action.label}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.25 + i * 0.05 }}
              whileHover={{ scale: 1.04 }}
              whileTap={{ scale: 0.97 }}
              className="group flex flex-col items-center gap-2 rounded-[var(--radius)] border border-border bg-card p-3.5 text-center shadow-card hover:border-primary/30 hover:shadow-card-hover transition-all duration-200"
            >
              <div
                className={cn(
                  'flex h-9 w-9 items-center justify-center rounded-xl text-white shadow-sm',
                  `bg-gradient-to-br ${action.gradient}`,
                  'group-hover:scale-110 transition-transform duration-200',
                )}
              >
                <Icon className="h-4 w-4" />
              </div>
              <div>
                <p className="text-xs font-semibold text-foreground leading-tight">
                  {action.label}
                </p>
                <p className="text-[10px] text-muted-foreground">{action.description}</p>
              </div>
            </motion.button>
          );
        })}
      </div>
    </motion.div>
  );
}
