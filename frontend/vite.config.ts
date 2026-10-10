import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

export default defineConfig(({ mode }) => ({
  plugins: [react()],
  resolve: {
    alias: {
      "@pages": fileURLToPath(
        new URL(mode === "test" ? "./src/routing/pages.eager.tsx" : "./src/routing/pages.lazy.tsx", import.meta.url),
      ),
    },
  },
  server: {
    port: 5173,
  },
  test: {
    environment: "jsdom",
    setupFiles: "./src/test/setup.ts",
    css: true,
    testTimeout: 10000,
  },
}));
