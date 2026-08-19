import { execSync } from 'node:child_process';
import type { NextConfig } from 'next';

/**
 * 建置識別碼——每次部署要有不同的值。
 *
 * 兩個地方靠它：`/api/version` 的新版偵測（`UpdatePrompt`），以及 service
 * worker 的快取鍵（換版時整批失效）。
 *
 * **在此之前 `NEXT_PUBLIC_BUILD_ID` 從未被設定過**，`/api/version` 一律回
 * `'dev'`，所以新版提示實際上永遠不會出現——那是個沒有錯誤訊息的靜默失效。
 *
 * 優先用 git commit：同一份原始碼得到同一個 id，重複建置不會無謂地讓使用者
 * 的快取失效。取不到（淺層 clone、非 git 環境）才退回時間戳。
 */
function resolveBuildId(): string {
  if (process.env.NEXT_PUBLIC_BUILD_ID) return process.env.NEXT_PUBLIC_BUILD_ID;
  try {
    return execSync('git rev-parse --short HEAD', { stdio: ['ignore', 'pipe', 'ignore'] })
      .toString()
      .trim();
  } catch {
    return Date.now().toString(36);
  }
}

const BUILD_ID = resolveBuildId();

const nextConfig: NextConfig = {
  generateBuildId: () => BUILD_ID,
  // 讓 client 端（SW 註冊）與 route handler 讀到同一個值。
  env: { NEXT_PUBLIC_BUILD_ID: BUILD_ID },
};

export default nextConfig;
