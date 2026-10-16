/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    // The /api rewrite proxy gives up after 30s by default, which cuts off
    // slow Coach answers (local LLM + tool rounds) with "Failed to fetch"
    // while the backend finishes and saves the reply anyway. The backend's
    // own LLM calls time out at 120s each, so allow up to 5 minutes.
    proxyTimeout: 300_000,
  },
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"}/api/:path*`,
      },
    ];
  },
};

module.exports = nextConfig;
