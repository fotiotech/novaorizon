/** @type {import('next').NextConfig} */
const contentSecurityPolicy = [
  "default-src 'self'",
  // GTM injects inline scripts; Next also emits inline bootstrap scripts.
  "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://www.googletagmanager.com https://www.google-analytics.com https://connect.facebook.net https://www.monetbil.com https://api.monetbil.com https://js.pusher.com",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "font-src 'self' data: https://fonts.gstatic.com",
  "img-src 'self' data: blob: https:",
  "connect-src 'self' https://*.mongodb.net https://api.monetbil.com https://www.google-analytics.com https://region1.google-analytics.com https://*.pusher.com wss://*.pusher.com https://firestore.googleapis.com https://*.googleapis.com https://graph.facebook.com",
  "frame-src 'self' https://www.googletagmanager.com https://www.google.com https://www.monetbil.com",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
].join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: contentSecurityPolicy },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), payment=()",
  },
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },
];

/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverActions: {
      bodySizeLimit: "3mb",
    },
  },
  poweredByHeader: false,
  async headers() {
    return [{ source: "/(.*)", headers: securityHeaders }];
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "firebasestorage.googleapis.com",
        port: "",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "lh3.googleusercontent.com",
        port: "",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: `${process.env.NEXT_PUBLIC_AWS_BUCKET_NAME}.s3.${process.env.NEXT_PUBLIC_AWS_REGION}.amazonaws.com`,
        pathname: "/uploads/**",
      },
      {
        protocol: "https",
        hostname: "cm.oraimo.com",
        port: "",
        pathname: "/**",
      },
    ],
  },
  reactCompiler: true,
  reactStrictMode: true,
};

export default nextConfig;
