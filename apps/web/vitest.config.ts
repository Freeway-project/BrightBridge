import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  test: {
    environment: "node",
    include: ["lib/**/__tests__/**/*.test.ts"],
    testTimeout: 10_000,
    // Pin the timezone so relative date/time helpers format deterministically
    // regardless of the machine/CI timezone.
    env: { TZ: "UTC" },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "."),
      "server-only": path.resolve(__dirname, "lib/__test-shims__/server-only.ts"),
    },
  },
});
