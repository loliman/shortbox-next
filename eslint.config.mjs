import nextCoreWebVitals from "eslint-config-next/core-web-vitals";
import nextTypescript from "eslint-config-next/typescript";
import boundaries from "eslint-plugin-boundaries";

const eslintConfig = [
  ...nextCoreWebVitals,
  ...nextTypescript,
  {
    ignores: [
      ".next/**",
      "node_modules/**",
      "next-env.d.ts",
      "src/services/MarvelCrawlerService.ts",
    ],
  },
  {
    plugins: { boundaries },
    settings: {
      "import/resolver": {
        typescript: {
          project: "./tsconfig.json",
          alwaysTryTypes: true,
        },
      },
      "boundaries/elements": [
        { type: "app", pattern: "app/**" },
        { type: "components", pattern: "src/components/**" },
        { type: "services", pattern: "src/services/**" },
        { type: "lib", pattern: "src/lib/**" },
        { type: "util", pattern: "src/util/**" },
        { type: "types", pattern: "src/types/**" },
        { type: "core", pattern: "src/core/**" },
      ],
    },
  },
  {
    ignores: [
      "src/lib/read/filter-read.ts",
      "src/lib/read/navigation-read.ts",
      "src/lib/routes/app-page.ts",
      "src/lib/routes/seo-filter-page.tsx",
      "src/lib/server/auth-write.ts",
      "src/lib/server/guards.ts",
      "src/lib/server/issues-write.ts",
      "src/lib/server/session.ts",
      "src/services/filter/filter-conflict-resolution-regression.test.ts",
      "src/services/filter/filter-normalization-parity.test.ts",
      "src/util/filter-updater.ts",
      "src/util/hierarchy.ts",
      "src/util/issuePresentation.ts",
      "src/util/listingQuery.ts",
    ],
    rules: {
      "boundaries/dependencies": [
        2,
        {
          default: "allow",
          rules: [
            { from: ["services"], disallow: ["app", "components"] },
            { from: ["lib"], disallow: ["app", "components", "services"] },
            { from: ["util"], disallow: ["app", "components", "services", "lib"] },
          ],
        },
      ],
    },
  },
  {
    files: ["**/*.test.ts", "**/*.test.tsx"],
    rules: {
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/no-unused-vars": "off",
      "react-hooks/globals": "off",
    },
  },
];

export default eslintConfig;
