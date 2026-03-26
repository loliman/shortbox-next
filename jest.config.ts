import type { Config } from "jest";

const config: Config = {
  preset: "ts-jest",
  // The default repository baseline is node-friendly Jest tests. Some existing
  // browser-oriented and Vitest-style tests are still present in the repo but
  // are not yet part of this execution model.
  testEnvironment: "node",
  roots: ["<rootDir>/src"],
  testMatch: ["**/*.test.ts", "**/*.test.tsx"],
  moduleNameMapper: {
    "^@/src/(.*)$": "<rootDir>/src/$1",
    "^@/(.*)$": "<rootDir>/$1",
  },
};

export default config;
