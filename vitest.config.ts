import { defineConfig } from "vitest/config";
import tsconfigPaths from "vite-tsconfig-paths";
import { loadEnv } from "vite";

export default defineConfig({
  plugins: [tsconfigPaths({ configNames: ["tsconfig.test.json"] })],
  test: {
    env: loadEnv("", process.cwd(), ""),
    // setupFiles: './tests/setup.ts',
    include: ["**/tests/**/**.spec.ts"],
  },
});
