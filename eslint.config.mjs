import { FlatCompat } from "@eslint/eslintrc";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const compat = new FlatCompat({ baseDirectory: __dirname });

const eslintConfig = [
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  {
    rules: {
      "react-hooks/exhaustive-deps": "error",
      "@next/next/no-html-link-for-pages": "error",
    },
  },
  {
    ignores: [
      "node_modules/**",
      ".next/**",
      "out/**",
      "out-local/**",
      "out-pages/**",
      "tools/**",
      "scripts/**",
      "assets-hifi/**",
      "playwright-report/**",
      "test-results/**",
      ".lighthouseci/**",
    ],
  },
];

export default eslintConfig;