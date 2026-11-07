import path from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: { "@": path.resolve(import.meta.dirname, "src") },
  },
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
    // PGlite parte in ~1s per file: margine per le migrazioni.
    testTimeout: 20_000,
    hookTimeout: 30_000,
  },
});
