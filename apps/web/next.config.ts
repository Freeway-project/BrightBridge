import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@coursebridge/ui", "@coursebridge/workflow"]
};

export default nextConfig;
