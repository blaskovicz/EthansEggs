import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    globalSetup: ["./tests/globalSetup.ts"],
    setupFiles: ["./tests/setupEnv.ts"],
    // Egg collections are keyed by (userId, date), so tests that touch the
    // same day must not run concurrently against a shared test database.
    fileParallelism: false,
    testTimeout: 15000,
    hookTimeout: 15000,
  },
});
