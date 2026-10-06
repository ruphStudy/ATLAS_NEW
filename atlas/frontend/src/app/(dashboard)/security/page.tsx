'use client';

import Link from 'next/link';
import { AlertTriangle, CheckCircle2, Flag, KeyRound, Link2, LogOut, ScrollText, ShieldCheck, XCircle } from 'lucide-react';
import { PageHeader } from '@/components/ui/page-header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { StatusBadge } from '@/components/ui/status-badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/ui/states';
import { useActorAuditHistory, useCurrentUser, useLogout, usePermissionChecks, useUser } from '@/hooks';
import type { AuditRiskLevel } from '@/types';

const RISK_TONE: Record<AuditRiskLevel, 'success' | 'warning' | 'danger'> = {
  NORMAL: 'success',
  SUSPICIOUS: 'warning',
  HIGH_RISK: 'danger',
};

const SECURITY_REFERENCES = [
  { label: 'API keys', description: 'Keys used for programmatic and service-account access.', href: '/api-keys', icon: KeyRound, slug: 'api-key-management' },
  { label: 'SSO connections', description: 'Organization single sign-on identity providers.', href: '/sso-connections', icon: ShieldCheck, slug: 'sso-framework' },
  { label: 'OAuth connections', description: 'Authorized OAuth clients and third-party connections.', href: '/oauth-connections', icon: Link2, slug: 'oauth-management' },
  { label: 'Full audit log', description: 'Complete workspace security and activity ledger.', href: '/audit-logs', icon: ScrollText, slug: 'audit-logs' },
];

export default function SecurityPage() {
  const currentUser = useCurrentUser();
  const { data: user, isLoading } = useUser(currentUser?.id);
  const logout = useLogout();
  const { canAccessModule, isLoaded: permissionsLoaded } = usePermissionChecks();
  const { data: activity, isLoading: activityLoading } = useActorAuditHistory(currentUser?.id, { actionCategory: 'LOGIN', limit: 15, sortOrder: 'desc' });

  const visibleReferences = permissionsLoaded ? SECURITY_REFERENCES.filter((r) => canAccessModule(r.slug)) : [];
  const isLockedOut = user?.status === 'SUSPENDED' || user?.status === 'INACTIVE';

  return (
    <div>
      <PageHeader title="Account & Security" description="Review your sign-in status, recent authentication activity and connected security surfaces." />

      {isLoading || !user ? (
        <Card>
          <CardContent className="space-y-4 p-6">
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-24 w-full" />
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6 lg:grid-cols-3">
          <Card className="lg:col-span-1">
            <CardHeader>
              <CardTitle>Security status</CardTitle>
              <CardDescription>Current state of your account credentials and access.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Account status</span>
                <StatusBadge status={user.status} />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Role</span>
                <Badge variant="outline" className="capitalize">{user.role.toLowerCase()}</Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Email verification</span>
                <span className="flex items-center gap-1 text-foreground">
                  {user.emailVerified ? <CheckCircle2 className="h-4 w-4 text-success" /> : <XCircle className="h-4 w-4 text-warning" />}
                  {user.emailVerified ? 'Verified' : 'Not verified'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Password sign-in</span>
                <span className="flex items-center gap-1 text-foreground">
                  <CheckCircle2 className="h-4 w-4 text-success" /> Enabled
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Last sign-in</span>
                <span className="text-foreground">{user.lastLoginAt ? new Date(user.lastLoginAt).toLocaleString() : 'Never'}</span>
              </div>

              {isLockedOut && (
                <div className="flex items-start gap-2 rounded-[var(--radius)] border border-danger/20 bg-danger/10 p-2 text-xs text-danger">
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                  <span>Your account is {user.status.toLowerCase()}. Contact a workspace administrator to restore access.</span>
                </div>
              )}
              {!user.emailVerified && !isLockedOut && (
                <div className="flex items-start gap-2 rounded-[var(--radius)] border border-warning/20 bg-warning/10 p-2 text-xs text-warning">
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                  <span>Your email address is not verified.</span>
                </div>
              )}

              <div className="border-t border-border pt-4">
                <Button variant="outline" className="w-full" onClick={() => logout.mutate()} disabled={logout.isPending}>
                  <LogOut className="h-4 w-4" />
                  Sign out of this session
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>Recent authentication activity</CardTitle>
              <CardDescription>Sign-in attempts recorded for your account, most recent first.</CardDescription>
            </CardHeader>
            <CardContent>
              {activityLoading ? (
                <div className="space-y-2">
                  {[0, 1, 2].map((i) => (
                    <Skeleton key={i} className="h-14 w-full" />
                  ))}
                </div>
              ) : !activity || activity.data.length === 0 ? (
                <EmptyState title="No authentication activity yet" description="Sign-in attempts for your account will appear here." className="border-none py-8" />
              ) : (
                <ul className="space-y-2">
                  {activity.data.map((entry) => (
                    <li key={entry.id} className="rounded-[var(--radius)] border border-border p-3 text-sm">
                      <div className="flex items-center justify-between gap-2">
                        <span className="flex items-center gap-2 font-medium text-foreground">
                          {entry.outcome === 'SUCCESS' ? <CheckCircle2 className="h-4 w-4 text-success" /> : <XCircle className="h-4 w-4 text-danger" />}
                          {entry.outcome === 'SUCCESS' ? 'Successful sign-in' : 'Failed sign-in attempt'}
                        </span>
                        <span className="shrink-0 text-xs text-muted-foreground">{new Date(entry.createdAt).toLocaleString()}</span>
                      </div>
                      {entry.reason && <p className="mt-1 text-xs text-muted-foreground">{entry.reason}</p>}
                      {(entry.riskLevel !== 'NORMAL' || entry.flagged) && (
                        <div className="mt-2 flex flex-wrap items-center gap-1.5">
                          {entry.riskLevel !== 'NORMAL' && <StatusBadge status={entry.riskLevel} tone={RISK_TONE[entry.riskLevel]} />}
                          {entry.flagged && (
                            <Badge variant="danger">
                              <Flag className="h-3 w-3" />
                              {entry.flagReason ? `Flagged: ${entry.flagReason}` : 'Flagged as suspicious'}
                            </Badge>
                          )}
                        </div>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {visibleReferences.length > 0 && (
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Connected security surfaces</CardTitle>
            <CardDescription>Manage workspace-level authentication and access integrations.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {visibleReferences.map((r) => (
              <Link key={r.href} href={r.href} className="flex flex-col gap-1 rounded-[var(--radius)] border border-border p-3 text-sm transition-colors hover:bg-secondary">
                <span className="flex items-center gap-2 font-medium text-foreground">
                  <r.icon className="h-4 w-4" />
                  {r.label}
                </span>
                <span className="text-xs text-muted-foreground">{r.description}</span>
              </Link>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
