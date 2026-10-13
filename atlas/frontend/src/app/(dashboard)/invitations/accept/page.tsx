'use client';

import { useEffect, useRef, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { isAxiosError } from 'axios';
import { CheckCircle2, Loader2, XCircle } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useAcceptInvitation } from '@/hooks';
import { ROUTES } from '@/constants';

function AcceptInvitationPageContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get('token');
  const acceptInvitation = useAcceptInvitation();
  const attempted = useRef(false);

  useEffect(() => {
    if (token && !attempted.current) {
      attempted.current = true;
      acceptInvitation.mutate(token);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <Card className="w-full max-w-md">
        <CardContent className="flex flex-col items-center gap-4 p-8 text-center">
          {!token ? (
            <>
              <XCircle className="h-10 w-10 text-danger" />
              <p className="text-sm font-semibold text-foreground">Missing invitation link</p>
              <p className="text-sm text-muted-foreground">This link is missing its invitation token.</p>
            </>
          ) : acceptInvitation.isPending ? (
            <>
              <Loader2 className="h-10 w-10 animate-spin text-primary" />
              <p className="text-sm font-semibold text-foreground">Accepting your invitation…</p>
            </>
          ) : acceptInvitation.isSuccess ? (
            <>
              <CheckCircle2 className="h-10 w-10 text-success" />
              <p className="text-sm font-semibold text-foreground">You&apos;ve joined the workspace</p>
              <Button onClick={() => router.push(ROUTES.WORKSPACES)}>Go to workspaces</Button>
            </>
          ) : acceptInvitation.isError ? (
            <>
              <XCircle className="h-10 w-10 text-danger" />
              <p className="text-sm font-semibold text-foreground">Couldn&apos;t accept this invitation</p>
              <p className="text-sm text-muted-foreground">
                {isAxiosError(acceptInvitation.error) ? (acceptInvitation.error.response?.data as { message?: string } | undefined)?.message ?? 'The link may be invalid or expired.' : 'The link may be invalid or expired.'}
              </p>
              <Button variant="outline" onClick={() => router.push(ROUTES.DASHBOARD)}>
                Back to dashboard
              </Button>
            </>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}

export default function AcceptInvitationPage() {
  return (
    <Suspense fallback={null}>
      <AcceptInvitationPageContent />
    </Suspense>
  );
}
