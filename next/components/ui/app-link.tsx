import Link from 'next/link';
import type { ComponentProps } from 'react';

/**
 * 全站的連結元件——**預設不自動預取**。
 *
 * Next 的 `<Link>` 預設會預取視窗內的所有目標。導覽列、清單、常駐說明文字裡的
 * 連結永遠在視窗內，於是每次 router 狀態變動就重取一輪；實測（`wrangler tail`）
 * 一次導覽曾產生 8 個背景 RSC 請求，而每一個都會經過 middleware 的
 * `supabase.auth.getClaims()`——使用者真正想去的那一頁得跟它們搶同一條線。
 *
 * 反過來預設不預取的代價很小：hover 與觸控起始時仍會預取，實際點下去的體感不變。
 *
 * **需要預取時明確寫 `prefetch`**（例如已知使用者下一步必定前往的目標），
 * 讓「要預取」成為一個有意識的決定，而不是忘了關的預設值。
 *
 * `eslint.config.mjs` 以 `no-restricted-imports` 擋掉直接 import `next/link`，
 * 免得下次有人新增連結時又走回預設值——那個故障沒有任何錯誤訊息，只是「有點慢」。
 */
export function AppLink({
  prefetch = false,
  ...rest
}: ComponentProps<typeof Link>) {
  return <Link prefetch={prefetch} {...rest} />;
}
