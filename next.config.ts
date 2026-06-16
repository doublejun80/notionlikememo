import type { NextConfig } from "next";

const isDevelopment = process.env.NODE_ENV !== "production";

const securityHeaders = [
  {
    key: "Content-Security-Policy",
    value: [
      "default-src 'self'",
      "base-uri 'self'",
      "frame-ancestors 'none'",
      "object-src 'none'",
      "img-src 'self' data: blob:",
      "font-src 'self' data:",
      "style-src 'self' 'unsafe-inline'",
      ["script-src", "'self'", "'unsafe-inline'", isDevelopment ? "'unsafe-eval'" : ""]
        .filter(Boolean)
        .join(" "),
      [
        "connect-src",
        "'self'",
        "https://api.openai.com",
        isDevelopment ? "ws://localhost:* ws://127.0.0.1:*" : ""
      ]
        .filter(Boolean)
        .join(" ")
    ].join("; ")
  },
  {
    key: "Referrer-Policy",
    value: "no-referrer"
  },
  {
    key: "X-Content-Type-Options",
    value: "nosniff"
  }
];

const nextConfig: NextConfig = {
  allowedDevOrigins: ["127.0.0.1", "localhost"],
  devIndicators: false,
  async headers() {
    return [
      {
        source: "/:path*",
        headers: securityHeaders
      }
    ];
  }
};

export default nextConfig;
