import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  root: ".",
  plugins: [react(), tailwindcss()],
  define: {
    "import.meta.env.VITE_API_URL": JSON.stringify("http://localhost:4000/api"),
    "import.meta.env.VITE_SUPABASE_URL": JSON.stringify("https://supabase.test"),
    "import.meta.env.VITE_SUPABASE_ANON_KEY": JSON.stringify("anon-test-key"),
  },
  test: {
    name: "frontend",
    environment: "jsdom",
    pool: "threads",
    fileParallelism: false,
    globals: true,
    setupFiles: ["tests/setup.ts"],
    include: ["tests/**/*.test.ts", "tests/**/*.test.tsx"],
    clearMocks: true,
    restoreMocks: true,
    coverage: {
      provider: "v8",
      reportsDirectory: "coverage/frontend",
    },
  },
});
