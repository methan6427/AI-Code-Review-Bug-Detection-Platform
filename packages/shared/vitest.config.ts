import { defineConfig } from "vitest/config";

export default defineConfig({
  root: ".",
  test: {
    name: "shared",
    environment: "node",
    pool: "threads",
    fileParallelism: false,
    globals: true,
    include: ["tests/**/*.test.ts"],
    clearMocks: true,
    restoreMocks: true,
    coverage: {
      provider: "v8",
      reportsDirectory: "coverage/shared",
    },
  },
});
