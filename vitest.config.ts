import { defineConfig } from "vitest/config";
import { loadEnv } from "vite";

export default defineConfig(({ mode }) => ({
  test: {
    include: ["tests/**/*.test.ts", "tests/**/*.test.tsx"],
    globals: true,
    env: loadEnv(mode, process.cwd(), ""),
    fileParallelism: false
  }
}));
