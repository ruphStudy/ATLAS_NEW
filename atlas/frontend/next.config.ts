import path from 'node:path';
import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // Produce a self-contained production runtime.
  // This helps Amplify package the required Next.js runtime dependencies
  // correctly when the frontend lives inside the atlas npm monorepo.
  output: 'standalone',

  // The frontend is atlas/frontend while npm workspaces and shared
  // dependencies live under atlas/. Allow Next.js output tracing to include
  // dependencies from the complete atlas workspace.
  outputFileTracingRoot: path.join(process.cwd(), '..'),

  // Enable React strict mode for development warnings
  reactStrictMode: true,

  // Disable X-Powered-By header
  poweredByHeader: false,

  // Compress responses
  compress: true,

  // Disable the floating Next.js dev tools indicator ("N" badge, bottom-left)
  // — dev-only debug overlay, not part of the ATLAS UI.
  devIndicators: false,

  // Lint runs separately (`npm run lint`); existing prettier debt must not block production builds.
  // Type checking still runs during `next build`.
  eslint: {
    ignoreDuringBuilds: true,
  },

  // Amazon SP-API Login URI must not leak amazon_state/selling_partner_id via Referer.
  async headers() {
    return [
      {
        source: '/amazon/oauth/:path*',
        headers: [{ key: 'Referrer-Policy', value: 'no-referrer' }],
      },
    ];
  },

  // Image optimization domains
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**.amazonaws.com',
      },
    ],
  },

  // Environment variables exposed to the browser
  // Prefix with NEXT_PUBLIC_
  env: {},

  // Experimental features
  experimental: {},

  // Redirect / rewrites can be added here when needed
};

export default nextConfig;
