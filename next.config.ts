import type { NextConfig } from "next";

const securityHeaders = [
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },
  {
    // Nothing in the app (dashboard, auth, or the public scan page) should
    // ever be framed — blocks clickjacking. frame-ancestors covers modern
    // browsers; X-Frame-Options covers legacy ones.
    key: "Content-Security-Policy",
    value: "frame-ancestors 'none'",
  },
  {
    key: "X-Frame-Options",
    value: "DENY",
  },
  {
    key: "X-Content-Type-Options",
    value: "nosniff",
  },
  {
    key: "Referrer-Policy",
    value: "no-referrer",
  },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=()",
  },
];

// Builds are target-specific (#92), so the hosted environment is known here.
// Mirrors isNonProductionDeployment() in lib/app-env.ts.
const nonProduction =
  ["dev", "uat"].includes(process.env.APP_ENV ?? "") ||
  process.env.VERCEL_ENV === "preview";

if (nonProduction) {
  securityHeaders.push({ key: "X-Robots-Tag", value: "noindex, nofollow" });
}

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "*.public.blob.vercel-storage.com",
      },
    ],
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: securityHeaders,
      },
    ];
  },
};

export default nextConfig;
