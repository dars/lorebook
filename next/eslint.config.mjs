import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // OpenNext 與 wrangler 的建置產物：全是 bundle 過的第三方程式碼，
    // 不加會 lint 出上萬條與本專案無關的問題。
    ".open-next/**",
    ".wrangler/**",
  ]),
]);

export default eslintConfig;
