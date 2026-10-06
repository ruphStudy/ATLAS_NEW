import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // Enable React strict mode for development warnings
  reactStrictMode: true,

  // Disable X-Powered-By header
  poweredByHeader: false,

  // Compress responses
  compress: true,

  // Disable the floating Next.js dev tools indicator ("N" badge, bottom-left)
  // — dev-only debug overlay, not part of the ATLAS UI.
  devIndicators: false,

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
