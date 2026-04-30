import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs";

const nextConfig: NextConfig = {
  transpilePackages: ["@coursebridge/ui", "@coursebridge/workflow"],
};

export default withSentryConfig(nextConfig, {
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,

  // Upload source maps in CI only — keeps local builds fast
  silent: true,
  sourcemaps: {
    disable: !process.env.CI,
  },

  // Tree-shake Sentry debug code from the client bundle (webpack builds; Turbopack dev ignores this)
  webpack: {
    treeshake: {
      removeDebugLogging: true,
    },
  },
});
