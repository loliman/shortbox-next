import nextJest from "next/jest.js";
import type { Config } from "jest";

const createJestConfig = nextJest({
  dir: "./",
});

const config: Config = {
  // The default repository baseline is node-friendly Jest tests. Some existing
  // browser-oriented and Vitest-style tests are still present in the repo but
  // are not yet part of this execution model.
  testEnvironment: "node",
  roots: ["<rootDir>/src"],
  testMatch: ["**/*.test.ts", "**/*.test.tsx"],
  testPathIgnorePatterns: [
    "/node_modules/",
    "src/components/top-bar/SearchBar.test.tsx",
    "src/components/nav-bar/listUtils.test.ts",
    "src/components/nav-bar/List.test.tsx",
    "src/components/generic/PaginatedQuery.test.tsx",
    "src/components/filter/FormActions.test.tsx",
    "src/components/filter/FilterSwitch.test.tsx",
    "src/components/top-bar/TopBar.test.tsx",
    "src/components/restricted/editor/IssueEditor.test.tsx",
    "src/components/restricted/editor/PublisherEditor.test.tsx",
    "src/components/restricted/editor/SeriesEditor.test.tsx",
    "src/components/restricted/editor/issue-editor/IssueEditorHints.test.tsx",
    "src/components/fab/AddFab.test.tsx",
    "src/components/footer/FooterLinks.test.tsx",
    "src/components/generic/AppContext.test.tsx",
  ],
};

export default createJestConfig(config);
