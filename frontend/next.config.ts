import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    unoptimized: true,
    remotePatterns: [
      {
        protocol: "https",
        hostname: "images.unsplash.com",
      },
      {
        protocol: "https",
        hostname: "drive.google.com",
      },
      {
        protocol: "https",
        hostname: "lh3.googleusercontent.com",
      },
    ],
  },
  webpack: (config) => {
    config.module.rules.push({
      test: /\.(tsx|ts|js|jsx)$/,
      loader: "string-replace-loader",
      options: {
        search: "http://localhost:8000",
        replace: process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000",
        flags: "g",
      },
    });
    config.module.rules.push({
      test: /\.(tsx|ts|js|jsx)$/,
      loader: "string-replace-loader",
      options: {
        search: "http://127.0.0.1:8000",
        replace: process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000",
        flags: "g",
      },
    });
    return config;
  },
  async rewrites() {
    return [
      {
        source: "/tour/:path*",
        destination: `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"}/static/uploads/documents/:path*`,
      },
    ];
  },
};

export default nextConfig;
