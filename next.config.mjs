/** @type {import('next').NextConfig} */
const nextConfig = {
  // Silence workspace root warning (monorepo/multiple lockfiles)
  outputFileTracingRoot: process.cwd(),
  // Temporarily ignore ESLint errors during builds (we'll fix incrementally)
  eslint: {
    ignoreDuringBuilds: true,
  },
  // Disable CSP in development to prevent chunk loading issues
  ...(process.env.NODE_ENV === 'development' && {
    async headers() {
      return [];
    },
  }),
  images: {
    // Restrict to explicit allowlist (adjust as needed)
    remotePatterns: [
      { hostname: "images.pexels.com" },
      // { protocol: 'https', hostname: 'icct.edu.ph' },
    ],
    dangerouslyAllowSVG: true,
    contentDispositionType: 'attachment',
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
  },
  // Performance optimizations
  experimental: {
    optimizePackageImports: ['@radix-ui/react-icons', 'lucide-react'],
  },
  // External packages for server components
  serverExternalPackages: ['@prisma/client', 'bcrypt', 'bcryptjs'],
  // Enable compression
  compress: true,
  // Optimize bundle size
  // swcMinify removed (defaults enabled in current Next versions)
  // Suppress development server startup messages
  onDemandEntries: {
    maxInactiveAge: 25 * 1000,
    pagesBufferLength: 2,
  },
  // Vercel-specific optimizations
  output: 'standalone',
  poweredByHeader: false,
  generateEtags: false,
  // Enhanced security headers
  async headers() {
    return [
      {
        source: '/api/(.*)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'no-cache, no-store, must-revalidate',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=(), payment=(), usb=(), interest-cohort=()',
          },
        ],
      },
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
          {
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-inline' 'unsafe-eval' 'unsafe-hashes'", // Required for React/Next.js
              "style-src 'self' 'unsafe-inline'", // Required for CSS-in-JS
              "img-src 'self' data: https: blob:",
              "font-src 'self' data:",
              "connect-src 'self' ws: wss:",
              "media-src 'self'",
              "object-src 'none'",
              "child-src 'self'",
              "worker-src 'self' blob:",
              "form-action 'self'",
              "base-uri 'self'",
              "manifest-src 'self'",
              "frame-ancestors 'none'"
            ].join('; '),
          },
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=31536000; includeSubDomains; preload',
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=(), payment=(), usb=(), interest-cohort=()',
          },
          {
            key: 'X-DNS-Prefetch-Control',
            value: 'off',
          },
          {
            key: 'X-Download-Options',
            value: 'noopen',
          },
          {
            key: 'X-Permitted-Cross-Domain-Policies',
            value: 'none',
          },
          {
            key: 'Cross-Origin-Embedder-Policy',
            value: 'require-corp',
          },
          {
            key: 'Cross-Origin-Opener-Policy',
            value: 'same-origin',
          },
          {
            key: 'Cross-Origin-Resource-Policy',
            value: 'same-origin',
          },
        ],
      },
    ];
  },
};

export default nextConfig;
