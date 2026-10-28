'use client';

import { useRouter } from 'next/navigation';

/**
 * 返回上一頁。
 *
 * **不寫死目的地。** 原本 `/library` 的返回是一個指向 `/main/system` 的 Link，
 * 但收藏紀錄有多個入口——設定頁、以及從別人的分享頁收藏之後（`collect-panel`）——
 * 後者的使用者從沒去過設定頁，卻會被丟到那裡，還離開了他原本在看的分享頁。
 * 建角流程接上收藏紀錄之後這會更明顯：從建角中途跳去收藏，回來必須回到原本
 * 那一步，寫死任何一個頁面都會錯。
 *
 * `fallback` 是給「沒有上一頁」的情況——直接貼網址開啟、或從外部連結進來時，
 * `router.back()` 會毫無反應（按了沒事發生是最難查的那種故障）。判斷放在
 * onClick 而非渲染時：`window.history` 在伺服器上不存在，拿它決定要渲染什麼
 * 會造成 hydration 不一致。
 */
export function BackButton({
  fallback,
  label = '返回',
  className = '',
}: {
  /** 沒有上一頁可回時的去處。 */
  fallback: string;
  label?: string;
  className?: string;
}) {
  const router = useRouter();

  return (
    <button
      type="button"
      onClick={() => {
        if (window.history.length > 1) router.back();
        else router.push(fallback);
      }}
      className={`flex min-h-11 items-center text-small text-text-secondary hover:text-gold ${className}`}
    >
      ← {label}
    </button>
  );
}
