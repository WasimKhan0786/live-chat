import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: false,
  typescript: {
    ignoreBuildErrors: true,
  },
  serverExternalPackages: ["bufferutil", "utf-8-validate"],
};

export default nextConfig;
