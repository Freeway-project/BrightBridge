import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  test: {
    include: ["apps/web/**/*.test.ts", "apps/web/**/*.test.tsx"],
    alias: {
      // "server-only" is a Next.js guard that throws outside RSC context.
      // In unit tests we treat it as a no-op so pure service modules can be
      // imported without a Next.js runtime.
      "server-only": path.resolve(__dirname, "./vitest-server-only-stub.js"),
    },
  },
});
