/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  eslint: {
    ignoreDuringBuilds: true,
  },
  async headers() {
    const securityHeaders = [
      {
        key: "Content-Security-Policy",
        value: [
          "default-src 'self'",
          "script-src 'self' 'unsafe-inline' https://www.google.com https://www.gstatic.com https://js.stripe.com",
          "connect-src 'self' https:",
          "img-src 'self' data: https:",
          "style-src 'self' 'unsafe-inline'",
          "frame-src 'self' https://www.google.com https://www.gstatic.com https://js.stripe.com",
        ].join("; "),
      },
    ];

    return [
      {
        source: "/:path*",
        headers: securityHeaders,
      },
    ];
  },
};

module.exports = nextConfig;
