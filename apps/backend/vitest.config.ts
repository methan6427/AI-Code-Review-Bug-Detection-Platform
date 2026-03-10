import { defineConfig } from "vitest/config";

export default defineConfig({
  root: ".",
  test: {
    name: "backend",
    environment: "node",
    pool: "threads",
    fileParallelism: false,
    globals: true,
    setupFiles: ["tests/setup.ts"],
    include: ["tests/**/*.test.ts"],
    clearMocks: true,
    restoreMocks: true,
    coverage: {
      provider: "v8",
      reportsDirectory: "coverage/backend",
    },
  },
});
