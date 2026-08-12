import { defineConfig } from "vitest/config";
import path from "node:path";
import { fileURLToPath } from "node:url";

const dirname = path.dirname(fileURLToPath(import.meta.url));

// Deliberately scoped to plain-logic tests only (see the *.test.ts files it picks up) —
// no Next.js plugin, no jsdom environment. Testing server actions/pages would mean mocking
// Prisma, Supabase, and the Anthropic SDK from scratch; this config exists to cover the
// pure, deterministic logic (URL handling, page-selection budgeting, template rendering,
// the SSRF IP-blocklist) that's cheap to test in isolation and has repeatedly been the
// actual source of production bugs per this codebase's own commit history.
export default defineConfig({
  resolve: {
    alias: {
      // Mirrors tsconfig.json's "@/*": ["./*"] — Vitest doesn't read tsconfig paths itself.
      "@": dirname,
    },
  },
  test: {
    include: ["**/*.test.ts"],
    exclude: ["node_modules/**", ".next/**"],
  },
});
