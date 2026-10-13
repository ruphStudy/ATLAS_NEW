import type { Metadata } from 'next';

// Amazon requires the Login URI page not to leak its query string
// (amazon_state, selling_partner_id) via the Referer header. The HTTP header
// is also set in next.config.ts; this meta tag covers client-side navigation.
export const metadata: Metadata = {
  title: 'Connect Amazon',
  referrer: 'no-referrer',
};

export default function AmazonOAuthLoginLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-mesh bg-background px-4">
      <div className="w-full max-w-md">{children}</div>
    </div>
  );
}
