import nextCoreWebVitals from "eslint-config-next/core-web-vitals";
import nextTypescript from "eslint-config-next/typescript";
import boundaries from "eslint-plugin-boundaries";

const eslintConfig = [
  ...nextCoreWebVitals,
  ...nextTypescript,
  {
    ignores: [
      ".next/**",
      "dist/**",
      "node_modules/**",
      "next-env.d.ts",
      "src/lib/server/marvel-crawler.ts",
    ],
  },
  {
    plugins: { boundaries },
    settings: {
      "import/resolver": {
        typescript: {
          alwaysTryTypes: true,
          project: "./tsconfig.json",
        },
      },
      "boundaries/elements": [
        { type: "app", pattern: "app/**" },
        { type: "components", pattern: "src/components/**" },
        { type: "services", pattern: "src/services/**" },
        { type: "lib", pattern: "src/lib/**" },
        { type: "util", pattern: "src/util/**" },
        { type: "types", pattern: "src/types/**" },
        { type: "core", pattern: "src/core/**" }
      ]
    }
  },
  {
    rules: {
      "boundaries/dependencies": [2, {
        default: "allow",
        rules: [
          {
            from: { type: "services" },
            disallow: { to: { type: ["app", "components"] } },
          },
          {
            from: { type: "lib" },
            disallow: { to: { type: ["app", "components", "services"] } },
          },
          {
            from: { type: "util" },
            disallow: { to: { type: ["app", "components", "services", "lib"] } },
          },
        ]
      }]
    }
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
