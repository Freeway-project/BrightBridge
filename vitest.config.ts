import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    alias: {
      // "server-only" is a Next.js guard that throws outside RSC context.
      // In unit tests we treat it as a no-op so pure service modules can be
      // imported without a Next.js runtime.
      "server-only": new URL("./vitest-server-only-stub.js", import.meta.url).pathname,
    },
  },
});
