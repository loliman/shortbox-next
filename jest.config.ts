import nextJest from "next/jest.js";
import type { Config } from "jest";

const createJestConfig = nextJest({
  dir: "./",
});

const config: Config = {
  // Jest is the repository default for unit and regression coverage. Keep
  // browser workflow confidence out of this layer and in Playwright instead.
  testEnvironment: "node",
  roots: ["<rootDir>/src"],
  testMatch: ["**/*.test.ts", "**/*.test.tsx"],
  testPathIgnorePatterns: ["/node_modules/"],
};

export default createJestConfig(config);
