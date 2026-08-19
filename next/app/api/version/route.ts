export const dynamic = 'force-static';

/**
 * 目前部署的建置識別碼，供前端偵測「已有新版本」。
 *
 * Flutter 版靠 service worker 的 `controllerchange` 得知新版；Next.js 這邊
 * 沒有 cache-first 的 SW，改以輪詢建置 id 判斷。`force-static` 讓它跟著
 * 部署走——同一個部署回同一個值，新部署才會變。
 */
export function GET() {
  return Response.json({
    buildId: process.env.NEXT_PUBLIC_BUILD_ID ?? 'dev',
  });
}
