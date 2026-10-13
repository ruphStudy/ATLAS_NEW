'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { isAxiosError } from 'axios';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { FormField } from '@/components/ui/form-field';
import { Select } from '@/components/ui/select';
import { ErrorState } from '@/components/ui/states';
import { AMAZON_PENDING_STATE_KEY, useContinueAmazonLoginUri, useMarketplaceProviders } from '@/hooks';

const AMAZON_PROVIDER_KEY = 'AMAZON';

/**
 * Amazon SP-API Login URI. Amazon sends the seller here with
 * amazon_callback_uri / amazon_state / selling_partner_id (/ version).
 * Middleware sends unauthenticated users through /login?next=… with the
 * query string intact; once signed in, the seller confirms and the backend
 * (which derives workspace/user from the session and validates the callback
 * URI) returns the URL back to Amazon.
 */
function AmazonOAuthLoginContent() {
  const searchParams = useSearchParams();
  const amazonCallbackUri = searchParams.get('amazon_callback_uri') ?? '';
  const amazonState = searchParams.get('amazon_state') ?? '';
  const sellingPartnerId = searchParams.get('selling_partner_id') ?? undefined;
  const version = searchParams.get('version') ?? undefined;

  const continueLogin = useContinueAmazonLoginUri();
  const { data: providers } = useMarketplaceProviders();
  const countryOptions = (providers?.find((p) => p.providerKey === AMAZON_PROVIDER_KEY)?.supportedCountries ?? []).map((c) => ({
    value: c,
    label: c,
  }));

  const [pendingState, setPendingState] = useState<string | undefined>(undefined);
  const [needsCountry, setNeedsCountry] = useState(false);
  const [country, setCountry] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let stored: string | null = null;
    try {
      stored = sessionStorage.getItem(AMAZON_PENDING_STATE_KEY);
    } catch {
      // Storage unavailable — ask for the country instead.
    }
    if (stored) setPendingState(stored);
    else setNeedsCountry(true);
  }, []);

  if (!amazonCallbackUri || !amazonState) {
    return <ErrorState title="Invalid Amazon authorization request" description="Start the connection again from Amazon Seller Central or ATLAS." />;
  }

  const submit = () => {
    setError(null);
    continueLogin.mutate(
      { amazonCallbackUri, amazonState, sellingPartnerId, version, pendingState, country: country || undefined },
      {
        onError: (err) => {
          const message = isAxiosError(err) ? (err.response?.data as { message?: string } | undefined)?.message : undefined;
          if (message?.includes('country')) {
            // The stored Connect Amazon context was missing/expired — ask explicitly.
            setNeedsCountry(true);
            setError('Select the Amazon marketplace to connect.');
          } else {
            setError(message ?? 'Could not continue Amazon authorization. Please try again.');
          }
        },
      },
    );
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Connect Amazon to ATLAS</CardTitle>
        <CardDescription>
          Authorize ATLAS to access {sellingPartnerId ? `seller account ${sellingPartnerId}` : 'your Amazon seller account'} for your current workspace.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {needsCountry && (
          <FormField label="Amazon marketplace" htmlFor="amazon-login-country" required>
            <Select
              id="amazon-login-country"
              value={country}
              onChange={(e) => setCountry(e.target.value)}
              options={countryOptions}
              placeholder="Select a marketplace"
            />
          </FormField>
        )}
        {error && <p className="text-sm text-danger">{error}</p>}
        <Button className="w-full" onClick={submit} disabled={continueLogin.isPending || (needsCountry && !country)}>
          {continueLogin.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Continue to Amazon
        </Button>
      </CardContent>
    </Card>
  );
}

export default function AmazonOAuthLoginPage() {
  return (
    <Suspense fallback={null}>
      <AmazonOAuthLoginContent />
    </Suspense>
  );
}
