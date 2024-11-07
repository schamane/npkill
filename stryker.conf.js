/**
 * @type {import('@stryker-mutator/api/core').StrykerOptions}
 */
const config = {
  packageManager: "pnpm",
  testRunner: "vitest",
  reporters: ["html", "clear-text", "progress"],
  coverageAnalysis: "perTest",
  vitest: {
    configFile: "./vitest.config.ts",
  },
};

export default config;
