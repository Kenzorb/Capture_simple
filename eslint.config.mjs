import js from "@eslint/js";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTypescript from "eslint-config-next/typescript";
import { defineConfig, globalIgnores } from "eslint/config";
import tseslint from "typescript-eslint";

export default defineConfig([
  globalIgnores([
    "**/.next/**",
    "**/.wxt/**",
    "**/.output/**",
    "**/dist/**",
    "**/coverage/**",
    "**/playwright-report/**",
    "**/test-results/**",
    "**/next-env.d.ts",
  ]),
  js.configs.recommended,
  {
    files: ["apps/web/**/*.{js,jsx,ts,tsx}"],
    extends: [nextVitals],
    settings: { next: { rootDir: "apps/web/" } },
  },
  {
    files: ["apps/web/**/*.{ts,tsx}"],
    extends: [nextTypescript],
  },
  {
    files: [
      "apps/extension/**/*.{ts,tsx}",
      "packages/**/*.{ts,tsx}",
      "tests/**/*.ts",
      "*.config.{ts,mts}",
    ],
    extends: [tseslint.configs.recommended],
  },
]);
