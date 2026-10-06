'use client';

import { Store, TrendingDown, TrendingUp } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { EmptyState } from '@/components/ui/states';
import { Skeleton } from '@/components/ui/skeleton';
import { formatCurrency } from '@/lib/utils';
import type { MarketplaceComparison } from '@/types';

export function MarketplacePanel({ comparisons, currency, loading }: { comparisons: MarketplaceComparison[]; currency: string; loading?: boolean }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Store className="h-4 w-4 text-primary" />
          Marketplace performance
        </CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <Skeleton className="h-40 w-full" />
        ) : comparisons.length === 0 ? (
          <EmptyState title="No marketplace data" description="Connect a marketplace account to see performance here." className="border-none py-8" />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Marketplace</TableHead>
                <TableHead>Revenue</TableHead>
                <TableHead>Orders</TableHead>
                <TableHead>AOV</TableHead>
                <TableHead>Fulfillment</TableHead>
                <TableHead>Returns</TableHead>
                <TableHead>Growth</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {comparisons.map((m) => (
                <TableRow key={m.marketplaceId}>
                  <TableCell className="text-sm font-medium text-foreground">
                    {m.marketplaceName}
                    <span className="ml-1.5 text-xs font-normal text-muted-foreground">{m.provider}</span>
                  </TableCell>
                  <TableCell className="text-sm text-foreground">{formatCurrency(m.revenue, currency)}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{m.orders.toLocaleString()}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{formatCurrency(m.averageOrderValue, currency)}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{(m.fulfillmentRate * 100).toFixed(1)}%</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{(m.returnRate * 100).toFixed(1)}%</TableCell>
                  <TableCell>
                    <span className={`flex items-center gap-1 text-sm font-medium ${m.revenueGrowth >= 0 ? 'text-success' : 'text-danger'}`}>
                      {m.revenueGrowth >= 0 ? <TrendingUp className="h-3.5 w-3.5" /> : <TrendingDown className="h-3.5 w-3.5" />}
                      {Math.abs(m.revenueGrowth).toFixed(1)}%
                    </span>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
