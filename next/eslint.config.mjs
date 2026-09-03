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
  {
    // 連結一律走 `@/components/ui/app-link` 的 AppLink——它預設不自動預取。
    //
    // Next 的 `<Link>` 預設會預取視窗內的所有目標，而導覽列與清單裡的連結永遠
    // 在視窗內。實測（wrangler tail）一次導覽曾產生 8 個背景 RSC 請求，每一個
    // 都會經過 middleware 的跨海 auth 驗證。這個故障沒有任何錯誤訊息，只表現為
    // 「有點慢」，所以靠人記得關是不可靠的——用 lint 擋住。
    //
    // 真的需要預取時，在 AppLink 上明確寫 `prefetch`。
    files: ["**/*.tsx", "**/*.ts"],
    ignores: ["components/ui/app-link.tsx"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          paths: [
            {
              name: "next/link",
              message:
                "改用 @/components/ui/app-link 的 AppLink（預設不自動預取）。需要預取時在該元件上明確寫 prefetch。",
            },
          ],
        },
      ],
    },
  },
]);

export default eslintConfig;
