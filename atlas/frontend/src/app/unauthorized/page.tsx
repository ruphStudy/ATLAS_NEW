'use client';

import Link from 'next/link';
import { UnauthorizedState } from '@/components/ui/states';
import { Button } from '@/components/ui/button';
import { ROUTES } from '@/constants';

export default function UnauthorizedPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-md">
        <UnauthorizedState className="border-none bg-card shadow-card" />
        <div className="mt-4 flex justify-center">
          <Link href={ROUTES.DASHBOARD}>
            <Button variant="outline">Back to dashboard</Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
